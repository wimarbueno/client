// @flow
import * as React from 'react'
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Divider,
  HeaderHoc,
  Icon,
  ScrollView,
  Text,
} from '../../../common-adapters'
import {globalColors, globalMargins, globalStyles} from '../../../styles'
import {isMobile} from '../../../constants/platform'
import {branch} from 'recompose'

import Participants from './participants'

import type {InfoPanelProps, ChannelInfoPanelProps} from '.'

const border = `1px solid ${globalColors.black_05}`
const containerStyle = isMobile
  ? {
      flex: 1,
      width: '100%',
    }
  : {
      backgroundColor: globalColors.white,
      borderLeft: border,
      borderRight: border,
      flex: 1,
      marginTop: -1,
      overflowY: 'auto',
    }

const _InfoPanel = (props: InfoPanelProps) => (
  <ScrollView style={containerStyle}>
    <Box style={{...globalStyles.flexBoxColumn, alignItems: 'stretch'}}>
      <Participants
        participants={props.participants}
        onAddParticipant={props.onAddParticipant}
        onShowProfile={props.onShowProfile}
      />

      <Divider style={{marginBottom: 20, marginTop: 20}} />

      <Box style={{...globalStyles.flexBoxRow, alignSelf: 'center'}}>
        <Checkbox
          checked={props.muted}
          disabled={props.onMuteConversation == null}
          onCheck={checked => props.onMuteConversation(checked)}
          label="Mute notifications"
        />
        <Icon
          type="iconfont-shh"
          style={{
            color: globalColors.black_20,
            marginLeft: globalMargins.tiny,
            ...(isMobile ? {fontSize: 24} : {}),
          }}
        />
      </Box>

      <Divider style={{marginBottom: 20, marginTop: 20}} />

      <Button type="Danger" label="Block this conversation" onClick={props.onShowBlockConversationDialog} />
    </Box>
  </ScrollView>
)

const _ChannelInfoPanel = (props: ChannelInfoPanelProps) => (
  <ScrollView style={containerStyle}>
    <Box style={{...globalStyles.flexBoxColumn, alignItems: 'stretch'}}>
      <Text style={{alignSelf: 'center', marginTop: 20}} type="BodySemibold">
        #{props.channelname}
      </Text>

      <Box style={{...globalStyles.flexBoxRow, alignSelf: 'center'}}>
        <Avatar teamname={props.teamname} size={16} />
        <Text style={{marginLeft: globalMargins.xtiny}} type="BodySmall">
          {props.teamname}
        </Text>
      </Box>

      <Divider style={{marginBottom: 20, marginTop: 20}} />

      <Box style={{...globalStyles.flexBoxRow, alignSelf: 'center'}}>
        <Checkbox
          checked={props.muted}
          disabled={props.onMuteConversation == null}
          onCheck={checked => props.onMuteConversation(checked)}
          label="Mute channel"
        />
        <Icon
          type="iconfont-shh"
          style={{
            color: globalColors.black_20,
            marginLeft: globalMargins.tiny,
            ...(isMobile ? {fontSize: 24} : {}),
          }}
        />
      </Box>

      <Divider style={{marginBottom: 20, marginTop: 20}} />

    <Text type="BodySmall">
      Members
    </Text>

      <Participants
        participants={props.participants}
        onAddParticipant={props.onAddParticipant}
        onShowProfile={props.onShowProfile}
      />
    </Box>
  </ScrollView>
)

const InfoPanel = branch(() => isMobile, HeaderHoc)(_InfoPanel)
const ChannelInfoPanel = branch(() => isMobile, HeaderHoc)(_ChannelInfoPanel)

export {InfoPanel, ChannelInfoPanel}
