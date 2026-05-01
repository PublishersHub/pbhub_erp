import { redirect } from 'next/navigation';

export default function LeaveIndex() {
  redirect('/leave/requests');
}
