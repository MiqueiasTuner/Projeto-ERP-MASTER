
import { ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Uploads a file to Firebase Storage and returns the download URL.
 * @param file The file to upload (File object or base64 string)
 * @param path The path in storage (e.g., 'properties/prop123/image1.jpg')
 * @returns Promise<string> The download URL
 */
export const uploadImage = async (file: File | string, path: string): Promise<string> => {
  if (!storage) {
    throw new Error('Firebase Storage is not initialized');
  }

  const storageRef = ref(storage, path);

  if (typeof file === 'string' && file.startsWith('data:')) {
    // Handle base64 string
    await uploadString(storageRef, file, 'data_url');
  } else if (file instanceof File) {
    // Handle File object
    await uploadBytes(storageRef, file);
  } else {
    throw new Error('Invalid file type for upload');
  }

  return await getDownloadURL(storageRef);
};
