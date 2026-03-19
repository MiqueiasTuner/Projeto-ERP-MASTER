import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db, isConfigured } from '../../lib/firebase';
import { UserAccount, UserRole } from '../../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { SUPER_ADMIN_EMAILS, INITIAL_PERMISSIONS } from '../constants';

export function useAuth() {
  const [session, setSession] = useState<FirebaseUser | null>(null);
  const [currentUserData, setCurrentUserData] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured || !auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setSession(user);
      if (!user) {
        setLoading(false);
        setCurrentUserData(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || !db) return;
    
    const unsub = onSnapshot(doc(db, 'users', session.uid), async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(data.email);
        
        if (isSuperAdmin && data.role !== UserRole.SUPER_ADMIN) {
          try {
            await setDoc(doc(db, 'users', session.uid), { role: UserRole.SUPER_ADMIN }, { merge: true });
          } catch (err) {
            console.error("Failed to bootstrap admin role:", err);
          }
        }

        setCurrentUserData({ 
          ...data, 
          id: snapshot.id,
          role: isSuperAdmin ? UserRole.SUPER_ADMIN : data.role
        } as UserAccount);
      } else {
        const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(session.email || '');
        if (isSuperAdmin) {
           const newUserData = {
             name: session.displayName || 'Admin',
             email: session.email,
             role: UserRole.SUPER_ADMIN,
             active: true,
             permissions: INITIAL_PERMISSIONS,
             createdAt: new Date().toISOString()
           };
           try {
             await setDoc(doc(db, 'users', session.uid), newUserData);
           } catch (err) {
             console.error("Failed to create super admin doc:", err);
           }
        }
      }
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${session?.uid}`);
      console.error("Error fetching current user data:", err);
      setLoading(false);
    });
    
    return () => unsub();
  }, [session]);

  return { session, currentUserData, loading };
}
