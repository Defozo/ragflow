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
import { message } from 'antd';

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

import { CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons';

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
    const docAggs = reference?.doc_aggs ?? [];
    const chunkDocs = reference?.chunks?.map(chunk => ({
      doc_id: chunk.doc_id,
      doc_name: chunk.doc_name
    })) ?? [];
    
    // Combine and deduplicate
    const allDocs = [...docAggs, ...chunkDocs];
    const uniqueDocs = Array.from(new Map(allDocs.map(item => [item.doc_id, item])).values());
    
    return uniqueDocs;
  }, [reference?.doc_aggs, reference?.chunks]);

  const filteredDocumentList = useMemo(() => {
    return referenceDocumentList.filter(
      doc => doc.doc_name !== "who-are-you.pdf"
    );
  }, [referenceDocumentList]);

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

  const onDownloadDocument = useCallback((docId: string, docName: string) => async () => {
    try {
      console.log('Downloading document:', docId, docName);
      const response = await fetch(`${api_host}/file/get_by_filename/${encodeURIComponent(docName)}`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = docName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading document:', error);
      message.error('Failed to download the document. Please try again.');
    }
  }, []);

  const isWagnerIntro = item.content.startsWith("Hello! I am Wagner, an assistant named after the character");

  const [isDocListExpanded, setIsDocListExpanded] = useState(false);

  const toggleDocList = useCallback(() => {
    setIsDocListExpanded(prev => !prev);
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
          {isAssistant ? (
            <AssistantIcon></AssistantIcon>
          ) : (
            <></>
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
            {isAssistant && filteredDocumentList.length > 0 && !isWagnerIntro && (
              <>
                <Button 
                  type="text" 
                  onClick={toggleDocList}
                  icon={isDocListExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
                >
                  {isDocListExpanded ? 'Hide' : 'Show'} {filteredDocumentList.length} source{filteredDocumentList.length > 1 ? 's' : ''}
                </Button>
                {isDocListExpanded && (
                  <List
                    bordered
                    dataSource={filteredDocumentList}
                    renderItem={(docItem) => {
                      if (!docItem.doc_id || !docItem.doc_name) return null;
                      return (
                        <List.Item>
                          <Flex gap={'small'} align="center">
                            <FileIcon
                              id={docItem.doc_id}
                              name={docItem.doc_name}
                            ></FileIcon>

                            <NewDocumentLink
                              documentId={docItem.doc_id}
                              documentName={docItem.doc_name}
                              prefix="document"
                            >
                              {docItem.doc_name}
                            </NewDocumentLink>

                            <Tooltip title={t('download', { keyPrefix: 'common' })}>
                              <Button
                                type="text"
                                icon={<DownloadOutlined />}
                                onClick={onDownloadDocument(docItem.doc_id, docItem.doc_name)}
                                style={{ marginLeft: '8px' }}
                              />
                            </Tooltip>
                          </Flex>
                        </List.Item>
                      );
                    }}
                  />
                )}
              </>
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