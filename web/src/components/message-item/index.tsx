import { ReactComponent as AssistantIcon } from '@/assets/svg/assistant.svg';
import { MessageType } from '@/constants/chat';
import { useSetModalState, useTranslate } from '@/hooks/common-hooks';
import { useSelectFileThumbnails } from '@/hooks/knowledge-hooks';
import { IReference, Message } from '@/interfaces/database/chat';
import { IChunk } from '@/interfaces/database/knowledge';
import classNames from 'classnames';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import {
  useFetchDocumentInfosByIds,
  useFetchDocumentThumbnailsByIds,
} from '@/hooks/document-hooks';
import MarkdownContent from '@/pages/chat/markdown-content';
import { getExtension, isImage } from '@/utils/document-util';
import { Avatar, Button, Flex, List, Typography } from 'antd';
import FileIcon from '../file-icon';
import IndentedTreeModal from '../indented-tree/modal';
import NewDocumentLink from '../new-document-link';
import styles from './index.less';

const { Text } = Typography;

interface IProps {
  item: Message;
  reference: IReference;
  loading?: boolean;
  nickname?: string;
  avatar?: string;
  clickDocumentButton?: (documentId: string, chunk: IChunk) => void;
}

const MessageItem = ({
  item,
  reference,
  loading = false,
  avatar = '',
  nickname = '',
  clickDocumentButton,
}: IProps) => {
  const isAssistant = item.role === MessageType.Assistant;
  const isUser = item.role === MessageType.Human; // Adjusted to check for Human type
  const { t } = useTranslate('chat');
  const fileThumbnails = useSelectFileThumbnails();
  const { data: documentList, setDocumentIds } = useFetchDocumentInfosByIds();
  const { data: documentThumbnails, setDocumentIds: setIds } =
    useFetchDocumentThumbnailsByIds();
  const { visible, hideModal, showModal } = useSetModalState();
  const [clickedDocumentId, setClickedDocumentId] = useState('');

  const referenceDocumentList = useMemo(() => {
    const docAggs = reference?.doc_aggs ?? [];
    const chunkDocs = (reference?.chunks ?? []).map(chunk => ({
      doc_id: chunk.doc_id,
      doc_name: chunk.docnm_kwd
    }));

    // Combine and deduplicate
    const combinedDocs = [...docAggs, ...chunkDocs];
    const uniqueDocs = combinedDocs.filter((doc, index, self) =>
      index === self.findIndex((t) => t.doc_id === doc.doc_id)
    );

    return uniqueDocs;
  }, [reference]);

  const content = useMemo(() => {
    let text = item.content;
    if (text === '') {
      text = t('searching');
    }
    return loading ? text?.concat('~~2$$') : text;
  }, [item.content, loading, t]);

  const handleUserDocumentClick = useCallback(
    (id: string) => () => {
      setClickedDocumentId(id);
      showModal();
    },
    [showModal],
  );

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
            <b>{isUser ? nickname : 'Librarian AI Assistant'}</b>
            <div
              className={
                isAssistant ? styles.messageText : styles.messageUserText
              }
            >
              <MarkdownContent
                content={content}
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