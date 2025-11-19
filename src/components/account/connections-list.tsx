"use client";
import React, { useEffect, useState } from 'react';
import ConnectionCard from './connection-card';
import SkeletonConnectionCard from './connection-card-skeleton';

type Conn = {
    id: number;
    alias: string;
    name?: string | null;
    profilePhoto?: string | null;
};

export default function ConnectionsList({ userName }: { userName: string }) {
    const [connections, setConnections] = useState<Conn[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [isOwnProfile, setIsOwnProfile] = useState(false);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        fetch(`/api/account/${encodeURIComponent(userName)}/connections`)
            .then((res) => res.json())
            .then((body) => {
                if (!mounted) return;
                setConnections(body.connections || []);
                setIsOwnProfile(Boolean(body.isOwnProfile));
            })
            .catch(() => {
                if (!mounted) return;
                setConnections([]);
            })
            .finally(() => mounted && setLoading(false));

        return () => { mounted = false; };
    }, [userName]);

    function handleRemoved(aliasToRemove: string) {
        setConnections((prev) => (prev ? prev.filter((c) => c.alias !== aliasToRemove) : prev));
    }

    if (loading) {
        return (
            <div aria-busy="true" className="space-y-3">
                {[1, 2, 3].map(i => <SkeletonConnectionCard key={i} />)}
            </div>
        );
    }

    if (!connections || connections.length === 0) return <div className="bg-white dark:bg-zinc-900 rounded-md p-6 border border-zinc-200 dark:border-zinc-800">No connections yet.</div>;

    return (
        <div className="space-y-3">
            {connections.map((c) => (
                <ConnectionCard
                    key={c.alias}
                    alias={c.alias}
                    name={c.name}
                    profilePhoto={c.profilePhoto ? { url: c.profilePhoto } : null}
                    onUnfollow={() => handleRemoved(c.alias)}
                    canUnfollow={isOwnProfile}
                />
            ))}
        </div>
    );
}
