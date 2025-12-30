/**
 * index.tsx - Entry point redirect to login
 * This file ensures the app starts at the login screen
 */

import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/login" />;
}
