'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    addDoc,
    serverTimestamp,
    doc,
    setDoc,
    FirestoreError,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { useFirestore } from '@/firebase/provider';

export interface UseProjectResult {
    projectId: string | null;
    isLoading: boolean;
    error: Error | null;
    createProject: () => Promise<void>;
    selectProject: (id: string) => void;
    resetProject: () => void;
}

export function useProject(user: User | null): UseProjectResult {
    const firestore = useFirestore();
    const [projectId, setProjectId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);

    const createProject = useCallback(async () => {
        if (!user || !firestore) return;

        setIsLoading(true);
        try {
            const projectsRef = collection(firestore, 'users', user.uid, 'projects');
            const newProjectRef = await addDoc(projectsRef, {
                createdAt: serverTimestamp(),
                members: { [user.uid]: 'owner' },
            });
            setProjectId(newProjectRef.id);
        } catch (err) {
            console.error("Error creating new project:", err);
            setError(err as Error);
        } finally {
            setIsLoading(false);
        }
    }, [user, firestore]);

    const selectProject = useCallback((id: string) => {
        setProjectId(id);
    }, []);

    const resetProject = useCallback(() => {
        setProjectId(null);
    }, []);

    // Removed auto-selection logic on mount

    return { projectId, isLoading, error, createProject, selectProject, resetProject };
}
