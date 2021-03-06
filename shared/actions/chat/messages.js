// @flow
import * as ChatTypes from '../../constants/types/flow-types-chat'
import * as Constants from '../../constants/chat'
import * as Creators from './creators'
import * as Shared from './shared'
import HiddenString from '../../util/hidden-string'
import {TlfKeysTLFIdentifyBehavior} from '../../constants/types/flow-types'
import {all, call, put, select} from 'redux-saga/effects'
import {isMobile} from '../../constants/platform'
import {usernameSelector} from '../../constants/selectors'
import {navigateTo} from '../../actions/route-tree'
import {chatTab} from '../../constants/tabs'

import type {TypedState} from '../../constants/reducer'
import type {SagaGenerator} from '../../constants/types/saga'

const deleteMessage = function*(action: Constants.DeleteMessage): SagaGenerator<any, any> {
  const {message} = action.payload
  let messageID: ?Constants.MessageID
  let conversationIDKey: ?Constants.ConversationIDKey
  switch (message.type) {
    case 'Text':
      conversationIDKey = message.conversationIDKey
      messageID = message.messageID
      break
    case 'Attachment':
      conversationIDKey = message.conversationIDKey
      messageID = message.messageID
      break
  }

  if (!conversationIDKey) throw new Error('No conversation for message delete')

  if (messageID) {
    // Deleting a server message.
    const [inboxConvo, conversationState] = yield all([
      select(Shared.selectedInboxSelector, conversationIDKey),
      select(Shared.conversationStateSelector, conversationIDKey),
    ])
    let lastMessageID
    if (conversationState) {
      const message = conversationState.messages.findLast(m => !!m.messageID)
      if (message) {
        lastMessageID = message.messageID
      }
    }

    yield put(navigateTo([], [chatTab, conversationIDKey]))

    const outboxID = yield call(ChatTypes.localGenerateOutboxIDRpcPromise)
    yield call(ChatTypes.localPostDeleteNonblockRpcPromise, {
      param: {
        clientPrev: lastMessageID,
        conversationID: Constants.keyToConversationID(conversationIDKey),
        identifyBehavior: TlfKeysTLFIdentifyBehavior.chatGui,
        outboxID,
        supersedes: messageID,
        tlfName: inboxConvo.name,
        tlfPublic: false,
      },
    })
  } else {
    // Deleting a local outbox message.
    const outboxID = message.outboxID
    if (!outboxID) throw new Error('No outboxID for pending message delete')

    yield call(ChatTypes.localCancelPostRpcPromise, {
      param: {outboxID: Constants.keyToOutboxID(outboxID)},
    })
    // It's deleted, but we don't get notified that the conversation now has
    // one less outbox entry in it.  Gotta remove it from the store ourselves.
    yield put(Creators.removeOutboxMessage(conversationIDKey, outboxID))
  }
}

const postMessage = function*(action: Constants.PostMessage): SagaGenerator<any, any> {
  let {conversationIDKey} = action.payload

  const inSearch = yield select((state: TypedState) => state.chat.get('inSearch'))
  if (inSearch) {
    yield put(Creators.exitSearch())
  }

  if (Constants.isPendingConversationIDKey(conversationIDKey)) {
    // Get a real conversationIDKey
    conversationIDKey = yield call(Shared.startNewConversation, conversationIDKey)
    if (!conversationIDKey) {
      return
    }
  }

  const [inboxConvo, conversationState] = yield all([
    select(Shared.selectedInboxSelector, conversationIDKey),
    select(Shared.conversationStateSelector, conversationIDKey),
  ])
  let lastMessageID
  if (conversationState) {
    const message = conversationState.messages.findLast(m => !!m.messageID)
    if (message) {
      lastMessageID = message.messageID
    }
  }

  const outboxID = yield call(ChatTypes.localGenerateOutboxIDRpcPromise)
  const author = yield select(usernameSelector)

  const message: Constants.Message = {
    author,
    conversationIDKey: action.payload.conversationIDKey,
    deviceName: '',
    deviceType: isMobile ? 'mobile' : 'desktop',
    editedCount: 0,
    failureDescription: '',
    key: Constants.messageKey(action.payload.conversationIDKey, 'outboxIDText', outboxID),
    message: new HiddenString(action.payload.text.stringValue()),
    messageState: 'pending',
    outboxID: Constants.outboxIDToKey(outboxID),
    senderDeviceRevokedAt: null,
    timestamp: Date.now(),
    type: 'Text',
    you: author,
  }

  const selectedConversation = yield select(Constants.getSelectedConversation)
  const appFocused = yield select(Shared.focusedSelector)

  yield put(
    Creators.appendMessages(
      conversationIDKey,
      conversationIDKey === selectedConversation,
      appFocused,
      [message],
      false
    )
  )

  yield call(ChatTypes.localPostTextNonblockRpcPromise, {
    param: {
      conversationID: Constants.keyToConversationID(conversationIDKey),
      tlfName: inboxConvo.name,
      tlfPublic: false,
      outboxID,
      body: action.payload.text.stringValue(),
      identifyBehavior: yield call(Shared.getPostingIdentifyBehavior, conversationIDKey),
      clientPrev: lastMessageID,
    },
  })
}

const editMessage = function*(action: Constants.EditMessage): SagaGenerator<any, any> {
  const {message} = action.payload
  let messageID: ?Constants.MessageID
  let conversationIDKey: Constants.ConversationIDKey = ''
  switch (message.type) {
    case 'Text':
    case 'Attachment': // fallthrough
      conversationIDKey = message.conversationIDKey
      messageID = message.messageID
      break
  }

  if (!messageID) {
    console.warn('Editing unknown message type', message)
    return
  }

  const [inboxConvo, conversationState] = yield all([
    select(Shared.selectedInboxSelector, conversationIDKey),
    select(Shared.conversationStateSelector, conversationIDKey),
  ])
  let lastMessageID
  if (conversationState) {
    const message = conversationState.messages.findLast(m => !!m.messageID)
    if (message) {
      lastMessageID = message.messageID
    }
  }

  // Not editing anymore
  yield put(Creators.showEditor(null))

  const outboxID = yield call(ChatTypes.localGenerateOutboxIDRpcPromise)
  yield call(ChatTypes.localPostEditNonblockRpcPromise, {
    param: {
      body: action.payload.text.stringValue(),
      clientPrev: lastMessageID,
      conversationID: Constants.keyToConversationID(conversationIDKey),
      identifyBehavior: TlfKeysTLFIdentifyBehavior.chatGui,
      outboxID,
      supersedes: messageID,
      tlfName: inboxConvo.name,
      tlfPublic: false,
    },
  })
}

const retryMessage = function*(action: Constants.RetryMessage): SagaGenerator<any, any> {
  const {conversationIDKey, outboxIDKey} = action.payload
  yield put(Creators.updateTempMessage(conversationIDKey, {messageState: 'pending'}, outboxIDKey))
  yield call(ChatTypes.localRetryPostRpcPromise, {
    param: {outboxID: Constants.keyToOutboxID(outboxIDKey)},
  })
}

export {deleteMessage, editMessage, postMessage, retryMessage}
