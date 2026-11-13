import {redirect} from 'next/navigation';

// The owner-scoped legacy encyclopedia RPC has been retired.
// Preserve old links without restoring a second dictionary implementation.
export default function RetiredEtymologyPage() {
  redirect('/dictionary');
}
