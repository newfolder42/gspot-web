"use client";

import { useState, useRef, useEffect } from 'react';
import { getCurrentUser } from '@/lib/session';
import { updatePostTitle, deletePost } from '@/lib/posts';

export default function PostActions({ postAuthor, postId, currentTitle }: { postAuthor: string; postId: number; currentTitle: string }) {
  const [open, setOpen] = useState(false);
  const [isOwnPost, setIsOwnPost] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editTitle, setEditTitle] = useState(currentTitle);
  const [isLoading, setIsLoading] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function checkUser() {
      const user = await getCurrentUser();
      setIsOwnPost(user?.alias === postAuthor);
    }
    checkUser();
  }, [postAuthor]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const handleEditClick = () => {
    setShowEditModal(true);
    setOpen(false);
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
    setOpen(false);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      alert('სათაური ცარიელი არ შეიძლება იყოს');
      return;
    }

    setIsLoading(true);
    const success = await updatePostTitle(postId, editTitle.trim());
    setIsLoading(false);

    if (success) {
      setShowEditModal(false);
      window.location.reload();
    } else {
      alert('სათაურის განახლება ვერ მოხერხდა');
    }
  };

  const handleConfirmDelete = async () => {
    setIsLoading(true);
    const success = await deletePost(postId);
    setIsLoading(false);

    if (success) {
      setShowDeleteModal(false);
      window.location.reload();
    } else {
      alert('პოსტის წაშლა ვერ მოხერხდა');
    }
  };

  if (!isOwnPost) {
    return null;
  }

  return (
    <>
      <div ref={ref} className="relative inline-block">
        <button
          aria-label="Post options"
          onClick={() => setOpen((s) => !s)}
          className="p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-600 dark:text-zinc-300" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg z-20">
            <button onClick={handleEditClick} className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800">რედაქტირება</button>
            <button onClick={handleDeleteClick} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-zinc-50 dark:hover:bg-zinc-800">წაშლა</button>
          </div>
        )}
      </div>

      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">რედაქტირება</h2>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 mb-4"
              placeholder="პოსტის სათაური"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-3 py-2 text-sm bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600"
                disabled={isLoading}
              >
                გაუქმება
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'შენახვა...' : 'შენახვა'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">გსურთ პოსტის წაშლა?</h2>

            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-3 py-2 text-sm bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600"
                disabled={isLoading}
              >
                გაუქმება
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'წაშლა...' : 'წაშლა'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
