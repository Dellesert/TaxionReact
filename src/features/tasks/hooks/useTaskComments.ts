import { useState, useCallback } from 'react';
import { TaskComment } from '../types/task.types';
import * as taskApi from '../api/task.api';

/**
 * Custom hook for managing task comments
 */
export const useTaskComments = (taskId: string) => {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [commentsOffset, setCommentsOffset] = useState(0);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  const loadComments = useCallback(async () => {
    try {
      const taskIdNum = Number(taskId);
      const response = await taskApi.getTaskComments(taskIdNum, 20, 0);
      setComments(response.comments);
      setCommentsOffset(20);
      setHasMoreComments(response.hasMore);
    } catch (error) {
      console.error('Failed to load comments:', error);
      throw error;
    }
  }, [taskId]);

  const loadMoreComments = useCallback(async () => {
    if (isLoadingMoreComments || !hasMoreComments) return;

    try {
      setIsLoadingMoreComments(true);
      const taskIdNum = Number(taskId);
      const response = await taskApi.getTaskComments(taskIdNum, 20, commentsOffset);
      setComments([...comments, ...response.comments]);
      setCommentsOffset(commentsOffset + response.comments.length);
      setHasMoreComments(response.hasMore);
    } catch (error) {
      console.error('Failed to load more comments:', error);
    } finally {
      setIsLoadingMoreComments(false);
    }
  }, [taskId, commentsOffset, hasMoreComments, isLoadingMoreComments, comments]);

  const sendComment = useCallback(async () => {
    if (!newComment.trim() || isSendingComment) return;

    try {
      setIsSendingComment(true);
      const taskIdNum = Number(taskId);
      await taskApi.addTaskComment(taskIdNum, { content: newComment });
      setNewComment('');
      await loadComments();
    } catch (error) {
      console.error('Failed to send comment:', error);
      throw error;
    } finally {
      setIsSendingComment(false);
    }
  }, [taskId, newComment, isSendingComment, loadComments]);

  const editComment = useCallback((comment: TaskComment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.content);
  }, []);

  const saveEditComment = useCallback(async (commentId: number) => {
    if (!editingCommentText.trim()) return;

    try {
      await taskApi.updateComment(commentId, editingCommentText);
      setEditingCommentId(null);
      setEditingCommentText('');
      await loadComments();
    } catch (error) {
      console.error('Failed to update comment:', error);
      throw error;
    }
  }, [editingCommentText, loadComments]);

  const cancelEdit = useCallback(() => {
    setEditingCommentId(null);
    setEditingCommentText('');
  }, []);

  const deleteComment = useCallback(async (commentId: number) => {
    try {
      await taskApi.deleteComment(commentId);
      await loadComments();
    } catch (error) {
      console.error('Failed to delete comment:', error);
      throw error;
    }
  }, [loadComments]);

  return {
    comments,
    newComment,
    setNewComment,
    isSendingComment,
    hasMoreComments,
    isLoadingMoreComments,
    editingCommentId,
    editingCommentText,
    setEditingCommentText,
    loadComments,
    loadMoreComments,
    sendComment,
    editComment,
    saveEditComment,
    cancelEdit,
    deleteComment,
  };
};
