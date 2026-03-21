import { redirect } from 'next/navigation';

export default function LoginPage() {
  // If the user lands on /login (like after MSAL logout or manual navigation),
  // simply redirect them back to the root where AuthProvider will handle authentication states.
  redirect('/');
}
