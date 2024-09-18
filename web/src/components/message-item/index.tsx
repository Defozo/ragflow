import { ReactComponent as AssistantIcon } from '@/assets/svg/assistant.svg';
import { MessageType } from '@/constants/chat';
import { useSetModalState } from '@/hooks/common-hooks';
import { useSelectFileThumbnails } from '@/hooks/knowledge-hooks';
import { IReference } from '@/interfaces/database/chat';
import { IChunk } from '@/interfaces/database/knowledge';
import classNames from 'classnames';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { DownloadOutlined } from '@ant-design/icons';
import { downloadFile } from '@/utils/file-util';
import { api_host } from '@/utils/api';
import { Button, Tooltip } from 'antd';
import { useTranslate } from '@/hooks/common-hooks';

import {
  useFetchDocumentInfosByIds,
  useFetchDocumentThumbnailsByIds,
} from '@/hooks/document-hooks';
import { IRegenerateMessage, IRemoveMessageById } from '@/hooks/logic-hooks';
import { IMessage } from '@/pages/chat/interface';
import MarkdownContent from '@/pages/chat/markdown-content';
import { getExtension, isImage } from '@/utils/document-util';
import { Avatar, Flex, List, Space, Typography } from 'antd';
import FileIcon from '../file-icon';
import IndentedTreeModal from '../indented-tree/modal';
import NewDocumentLink from '../new-document-link';
import { AssistantGroupButton, UserGroupButton } from './group-button';
import styles from './index.less';

const { Text } = Typography;

interface IProps extends Partial<IRemoveMessageById>, IRegenerateMessage {
  item: IMessage;
  reference: IReference;
  loading?: boolean;
  sendLoading?: boolean;
  nickname?: string;
  avatar?: string;
  clickDocumentButton?: (documentId: string, chunk: IChunk) => void;
  index: number;
  showLikeButton?: boolean;
}

const MessageItem = ({
  item,
  reference,
  loading = false,
  avatar = '',
  sendLoading = false,
  clickDocumentButton,
  index,
  removeMessageById,
  regenerateMessage,
  showLikeButton = true,
}: IProps) => {
  const { t } = useTranslate('namespace');
  const isAssistant = item.role === MessageType.Assistant;
  const isUser = item.role === MessageType.User;
  const fileThumbnails = useSelectFileThumbnails();
  const { data: documentList, setDocumentIds } = useFetchDocumentInfosByIds();
  const { data: documentThumbnails, setDocumentIds: setIds } =
    useFetchDocumentThumbnailsByIds();
  const { visible, hideModal, showModal } = useSetModalState();
  const [clickedDocumentId, setClickedDocumentId] = useState('');

  const referenceDocumentList = useMemo(() => {
    return reference?.doc_aggs ?? [];
  }, [reference?.doc_aggs]);

  const handleUserDocumentClick = useCallback(
    (id: string) => () => {
      setClickedDocumentId(id);
      showModal();
    },
    [showModal],
  );

  const handleRegenerateMessage = useCallback(() => {
    regenerateMessage?.(item);
  }, [regenerateMessage, item]);

  useEffect(() => {
    const ids = item?.doc_ids ?? [];
    if (ids.length) {
      setDocumentIds(ids);
      const documentIds = ids.filter((x) => !(x in fileThumbnails));
      if (documentIds.length) {
        setIds(documentIds);
      }
    }
  }, [item.doc_ids, setDocumentIds, setIds, fileThumbnails]);

  const onDownloadDocument = useCallback((docId: string, docName: string) => () => {
    console.log('Downloading document:', docId, docName);
    downloadFile({
      url: `${api_host}/file/get/d273635c720a11ef88d80242ac150006`, //TODO: Implement download file
      filename: docName,
    });
  }, []);

  return (
    <div
      className={classNames(styles.messageItem, {
        [styles.messageItemLeft]: isAssistant,
        [styles.messageItemRight]: isUser,
      })}
    >
      <section
        className={classNames(styles.messageItemSection, {
          [styles.messageItemSectionLeft]: isAssistant,
          [styles.messageItemSectionRight]: isUser,
        })}
      >
        <div
          className={classNames(styles.messageItemContent, {
            [styles.messageItemContentReverse]: isUser,
          })}
        >
          {isUser ? (
            <Avatar
              size={40}
              src={
                require('@/assets/svg/default-avatar.svg').default
              }
            />
          ) : (
            <AssistantIcon></AssistantIcon>
          )}
          <Flex vertical gap={8} flex={1}>
            <Space>
              {isAssistant ? (
                index !== 0 && (
                  <AssistantGroupButton
                    messageId={item.id}
                    content={item.content}
                    prompt={item.prompt}
                    showLikeButton={showLikeButton}
                    audioBinary={item.audio_binary}
                  ></AssistantGroupButton>
                )
              ) : (
                <UserGroupButton
                  content={item.content}
                  messageId={item.id}
                  removeMessageById={removeMessageById}
                  regenerateMessage={
                    regenerateMessage && handleRegenerateMessage
                  }
                  sendLoading={sendLoading}
                ></UserGroupButton>
              )}
            </Space>
            <div
              className={
                isAssistant ? styles.messageText : styles.messageUserText
              }
            >
              <MarkdownContent
                loading={loading}
                content={item.content}
                reference={reference}
                clickDocumentButton={clickDocumentButton}
              ></MarkdownContent>
            </div>
            {isAssistant && referenceDocumentList.length > 0 && (
              <List
                bordered
                dataSource={referenceDocumentList}
                renderItem={(item) => {
                  return (
                    <List.Item>
                      <Flex gap={'small'} align="center">
                        <FileIcon
                          id={item.doc_id}
                          name={item.doc_name}
                        ></FileIcon>

                        <NewDocumentLink
                          documentId={item.doc_id}
                          documentName={item.doc_name}
                          prefix="document"
                        >
                          {item.doc_name}
                        </NewDocumentLink>

                        <Tooltip title={t('download', { keyPrefix: 'common' })}>
                          <Button
                            type="text"
                            icon={<DownloadOutlined />}
                            onClick={onDownloadDocument(item.doc_id, item.doc_name)}
                            style={{ marginLeft: '8px' }}
                          />
                        </Tooltip>
                      </Flex>
                    </List.Item>
                  );
                }}
              />
            )}
            {isUser && documentList.length > 0 && (
              <List
                bordered
                dataSource={documentList}
                renderItem={(item) => {
                  return (
                    <List.Item>
                      <Flex gap={'small'} align="center">
                        <FileIcon
                          id={item.id}
                          name={item.name}
                        ></FileIcon>

                        <NewDocumentLink
                          documentId={item.id}
                          documentName={item.name}
                          prefix="document"
                        >
                          {item.name}
                        </NewDocumentLink>
                      </Flex>
                    </List.Item>
                  );
                }}
              />
            )}
          </Flex>
        </div>
      </section>
    </div>
  );
};

export default memo(MessageItem);