"use client";

import { useState } from 'react';
import type { PostCommentType } from '@/types/post-comment';
import type { PostGuessMapDataType, PostGuessType } from '@/types/post-guess';
import { addCommentAction, loadPostCommentsAction } from '@/actions/comments';
import PostComment from './post-comment';
import NewGuess from './new-guess';
import NewPhotoGuess from './new-photo-guess';
import { getPostGuessMapPoints } from '@/lib/posts';
import { MapPinIcon, XIcon, CameraIcon } from './icons';
import { mapDefaultCenter, mapMaxBounds, mapMaxZoom } from '@/lib/map';
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    mapboxgl: any;
  }
}

type PostCommentsProps = {
  comments: PostCommentType[];
  postId: number;
  postAuthorAlias: string;
  isAuthor: boolean;
  canGuess: boolean;
  currentUser: string;
  postImage?: string;
  postTitle?: string;
  guessCount: number;
  onGuessSubmitted?: (guess: PostGuessType) => void;
  onCommentAdded?: (comment: PostCommentType) => void;
};

function insertComment(
  tree: PostCommentType[],
  newComment: PostCommentType
): PostCommentType[] {
  if (newComment.parentId === null) {
    return [newComment, ...tree];
  }
  return tree.map((c) => {
    if (c.id === newComment.parentId) {
      return { ...c, children: [newComment, ...c.children] };
    }
    if (c.children.length > 0) {
      return { ...c, children: insertComment(c.children, newComment) };
    }
    return c;
  });
}

export default function PostComments({
  comments: initialComments,
  postId,
  postAuthorAlias,
  isAuthor,
  canGuess,
  currentUser,
  postImage,
  postTitle,
  guessCount,
  onGuessSubmitted,
  onCommentAdded,
}: PostCommentsProps) {
  const [comments, setComments] = useState<PostCommentType[]>(initialComments);
  const [body, setBody] = useState('');
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showGuessModal, setShowGuessModal] = useState(false);
  const [showPhotoGuessModal, setShowPhotoGuessModal] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [loadingMapPoints, setLoadingMapPoints] = useState(false);
  const [mapPointsError, setMapPointsError] = useState<string | null>(null);
  const [mapData, setMapData] = useState<PostGuessMapDataType | null>(null);
  const [guessCount2, setGuessCount2] = useState(guessCount);
  const [canGuess2, setCanGuess2] = useState(canGuess);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const activePopupRef = useRef<any>(null);

  const handleCommentAdded = (newComment: PostCommentType) => {
    setComments((prev) => insertComment(prev, newComment));
    if (typeof onCommentAdded === 'function') onCommentAdded(newComment);
  };

  const refreshComments = async () => {
    const nextComments = await loadPostCommentsAction(postId);
    setComments(nextComments);
  };

  const handleSubmitComment = async () => {
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const newComment = await addCommentAction(postId, trimmed, null);
      if (newComment) {
        handleCommentAdded(newComment);
        setBody('');
        setComposerExpanded(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuessSubmitted = async (newGuess: PostGuessType) => {
    setCanGuess2(false);
    setGuessCount2((n) => n + 1);
    await refreshComments();
    onGuessSubmitted?.(newGuess);
  };

  useEffect(() => {
    if (!showMap) return;
    if (!mapData || (mapData.guessPoints.length === 0 && !mapData.photoCoordinates)) return;

    if (!document.querySelector('link[href*="mapbox-gl.css"]')) {
      const link = document.createElement('link');
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.20.0/mapbox-gl.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    const initMap = () => {
      if (!mapRef.current || mapInstanceRef.current || !window.mapboxgl) return;

      window.mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

      const photoLng = Number(mapData?.photoCoordinates?.longitude);
      const photoLat = Number(mapData?.photoCoordinates?.latitude);
      const initialCenter: [number, number] =
        isFinite(photoLng) && isFinite(photoLat)
          ? [photoLng, photoLat]
          : mapDefaultCenter;

      const map = new window.mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/standard-satellite',
        center: initialCenter,
        zoom: 8,
        renderWorldCopies: false,
        maxBounds: mapMaxBounds,
        maxZoom: mapMaxZoom,
      });

      const bounds = new window.mapboxgl.LngLatBounds();
      const markerList: any[] = [];

      if (mapData.photoCoordinates) {
        const pLng = Number(mapData.photoCoordinates.longitude);
        const pLat = Number(mapData.photoCoordinates.latitude);
        if (isFinite(pLng) && isFinite(pLat)) {
          const photoPopupBody = document.createElement('div');
          photoPopupBody.style.fontSize = '14px';
          photoPopupBody.style.lineHeight = '1.3';
          photoPopupBody.style.padding = '4px 6px';
          photoPopupBody.style.background = '#ffffff';
          photoPopupBody.style.color = '#18181b';
          photoPopupBody.style.borderRadius = '6px';

          const photoLabel = document.createElement('strong');
          photoLabel.textContent = 'ფოტოს ლოკაცია';
          photoLabel.style.color = '#ef4444';
          photoPopupBody.appendChild(photoLabel);

          const photoPopup = new window.mapboxgl.Popup({ closeButton: false, closeOnClick: false }).setDOMContent(photoPopupBody);

          const photoEl = document.createElement('div');
          photoEl.style.width = '16px';
          photoEl.style.height = '16px';
          photoEl.style.borderRadius = '9999px';
          photoEl.style.background = '#ef4444';
          photoEl.style.border = '3px solid #ffffff';
          photoEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.4)';
          photoEl.style.cursor = 'pointer';

          const photoMarker = new window.mapboxgl.Marker({ element: photoEl })
            .setLngLat([pLng, pLat])
            .addTo(map);

          photoEl.addEventListener('mouseenter', () => {
            if (activePopupRef.current !== photoPopup) {
              photoPopup.setLngLat([pLng, pLat]).addTo(map);
            }
          });
          photoEl.addEventListener('mouseleave', () => {
            if (activePopupRef.current !== photoPopup) {
              photoPopup.remove();
            }
          });
          photoEl.addEventListener('click', (e) => {
            e.stopPropagation();
            if (activePopupRef.current === photoPopup) {
              photoPopup.remove();
              activePopupRef.current = null;
            } else {
              if (activePopupRef.current) {
                activePopupRef.current.remove();
              }
              photoPopup.setLngLat([pLng, pLat]).addTo(map);
              activePopupRef.current = photoPopup;
            }
          });

          markerList.push(photoMarker);
          bounds.extend([pLng, pLat]);
        }
      }

      mapData.guessPoints.forEach((point) => {
        const lng = Number(point.coordinates.longitude);
        const lat = Number(point.coordinates.latitude);
        if (!isFinite(lng) || !isFinite(lat)) return;

        const popupBody = document.createElement('div');
        popupBody.style.fontSize = '14px';
        popupBody.style.lineHeight = '1.3';
        popupBody.style.padding = '4px 4px';
        popupBody.style.background = '#ffffff';
        popupBody.style.color = '#18181b';
        popupBody.style.borderRadius = '6px';

        const userLine = document.createElement('a');
        userLine.href = `/account/${point.author}`;
        userLine.textContent = point.author;
        userLine.style.fontWeight = 'bold';
        userLine.style.color = 'inherit';
        userLine.style.textDecoration = 'underline';
        userLine.style.cursor = 'pointer';
        userLine.addEventListener('click', (e) => {
          e.stopPropagation();
        });
        popupBody.appendChild(userLine);
        popupBody.appendChild(document.createElement('br'));

        const distanceLine = document.createElement('span');
        distanceLine.textContent = `მანძილი: ${point.distance ?? '-'} მ`;
        popupBody.appendChild(distanceLine);
        popupBody.appendChild(document.createElement('br'));

        const scoreLine = document.createElement('span');
        scoreLine.textContent = `ქულა: ${point.score ?? '-'}`;
        popupBody.appendChild(scoreLine);

        const popup = new window.mapboxgl.Popup({ closeButton: false, closeOnClick: false }).setDOMContent(popupBody);

        const el = document.createElement('div');
        el.style.width = '12px';
        el.style.height = '12px';
        el.style.borderRadius = '9999px';
        el.style.background = '#2563eb';
        el.style.border = '2px solid #ffffff';
        el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.35)';
        el.style.cursor = 'pointer';

        const marker = new window.mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);

        el.addEventListener('mouseenter', () => {
          if (activePopupRef.current !== popup) {
            popup.setLngLat([lng, lat]).addTo(map);
          }
        });
        el.addEventListener('mouseleave', () => {
          if (activePopupRef.current !== popup) {
            popup.remove();
          }
        });
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          if (activePopupRef.current === popup) {
            popup.remove();
            activePopupRef.current = null;
          } else {
            if (activePopupRef.current) {
              activePopupRef.current.remove();
            }
            popup.setLngLat([lng, lat]).addTo(map);
            activePopupRef.current = popup;
          }
        });

        markerList.push(marker);
        bounds.extend([lng, lat]);
      });

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 40, maxZoom: 14 });
      }

      map.on('click', () => {
        if (activePopupRef.current) {
          activePopupRef.current.remove();
          activePopupRef.current = null;
        }
      });

      mapInstanceRef.current = map;
      markersRef.current = markerList;
    };

    if (typeof window.mapboxgl === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.20.0/mapbox-gl.js';
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      if (activePopupRef.current) {
        activePopupRef.current.remove();
        activePopupRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [showMap, mapData]);

  const handleOpenMap = async () => {
    setShowMap(true);
    if (!isAuthor || mapData !== null || loadingMapPoints) return;

    setLoadingMapPoints(true);
    setMapPointsError(null);

    try {
      const data = await getPostGuessMapPoints(postId);
      setMapData(data);
    } catch {
      setMapPointsError('რუკის მონაცემების ჩატვირთვა ვერ მოხერხდა.');
      setMapData({ guessPoints: [], photoCoordinates: null });
    } finally {
      setLoadingMapPoints(false);
    }
  };

  const actionButtonClass =
    'inline-flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 transition-colors';

  return (
    <div className="mt-4">
      {/* Header bar */}
      <div className="px-4 py-2 flex items-center justify-end gap-3">

        <div className="flex items-center gap-2">
          {isAuthor && guessCount2 > 0 && (
            <button
              type="button"
              onClick={handleOpenMap}
              className={actionButtonClass}
              title="რუკაზე ყველა გამოცნობის ჩვენება"
            >
              <MapPinIcon className="w-5 h-5" />
              <span>რუკაზე ნახვა</span>
            </button>
          )}

          {/* Non-author: guess buttons */}
          {!isAuthor && canGuess2 && (
            <>
              <button
                type="button"
                onClick={() => setShowGuessModal(true)}
                className={actionButtonClass}
              >
                <MapPinIcon className="w-5 h-5" />
                <span>რუკაზე</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPhotoGuessModal(true)}
                className={actionButtonClass}
              >
                <CameraIcon className="w-5 h-5" />
                <span>ადგილზე</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* New top-level comment form */}
      {currentUser && (
        <div className="px-4 py-3">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-shadow focus-within:ring-1 focus-within:ring-teal-500">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onFocus={() => setComposerExpanded(true)}
              placeholder="კომენტარი..."
              maxLength={2000}
              className="w-full rounded-2xl bg-transparent px-3 py-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none resize-none"
            />
            {(composerExpanded || body.trim().length > 0) && (
              <div className="flex items-center justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800 px-3 py-2">
                <button
                  type="button"
                  onClick={() => {
                    setBody('');
                    setComposerExpanded(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  გაუქმება
                </button>
                <button
                  type="button"
                  onClick={handleSubmitComment}
                  disabled={submitting || !body.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'იგზავნება...' : 'გაგზავნა'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comments tree */}
      <div className="px-4 py-2 space-y-1">
        {comments && comments.length !== 0 &&
          comments.map((comment) => (
            <PostComment
              key={comment.id}
              comment={comment}
              depth={0}
              currentUser={currentUser}
              postId={postId}
              postAuthorAlias={postAuthorAlias}
              onCommentAdded={handleCommentAdded}
            />
          ))}
      </div>

      {/* Photo guess modal */}
      {showPhotoGuessModal && (
        <NewPhotoGuess
          postId={postId}
          postTitle={postTitle}
          onClose={() => setShowPhotoGuessModal(false)}
          onSubmitted={handleGuessSubmitted}
        />
      )}

      {/* Guess modal */}
      {showGuessModal && (
        <NewGuess
          postId={postId}
          postImage={postImage}
          postTitle={postTitle || ''}
          onClose={() => setShowGuessModal(false)}
          onSubmitted={handleGuessSubmitted}
        />
      )}

      {showMap && (
        <div className="fixed inset-0 z-layer-modal bg-zinc-900/50 backdrop-blur-sm p-4">
          <div className="mx-auto h-full max-w-4xl rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">გამოცნობები რუკაზე</h3>
              <button
                type="button"
                onClick={() => setShowMap(false)}
                className="p-2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                aria-label="დახურვა"
                title="დახურვა"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            {loadingMapPoints ? (
              <div className="flex-1 flex items-center justify-center text-sm text-zinc-600 dark:text-zinc-300 px-4 text-center">
                იტვირთება...
              </div>
            ) : mapPointsError ? (
              <div className="flex-1 flex items-center justify-center text-sm text-rose-600 dark:text-rose-400 px-4 text-center">
                {mapPointsError}
              </div>
            ) : (mapData?.guessPoints.length ?? 0) > 0 || mapData?.photoCoordinates ? (
              <div ref={mapRef} className="flex-1 bg-zinc-100 dark:bg-zinc-800" />
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-zinc-600 dark:text-zinc-300 px-4 text-center">
                ამ პოსტის გამოცნობებისთვის რუკის წერტილები ვერ მოიძებნა.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
