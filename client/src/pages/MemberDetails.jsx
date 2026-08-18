import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { membersApi } from '../api/members';
import { formatDate } from '../utils/formatDate';

export default function MemberDetails() {
  const { id } = useParams();
  const { token } = useAuth();
  const [member, setMember] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    membersApi.get(token, id).then(setMember).catch((err) => setError(err.message));
  }, [token, id]);

  if (error) return <div className="bg-red-100 text-red-700 px-4 py-3 rounded">{error}</div>;
  if (!member) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{member.first_name} {member.last_name}</h1>
      <div className="bg-white rounded-lg shadow p-6 grid grid-cols-2 gap-4 text-sm">
        <div><span className="text-gray-500">Email</span><div>{member.email}</div></div>
        <div><span className="text-gray-500">Phone</span><div>{member.phone}</div></div>
        <div><span className="text-gray-500">Join Date</span><div>{formatDate(member.join_date)}</div></div>
        <div><span className="text-gray-500">Status</span><div>{member.is_active ? 'Active' : 'Inactive'}</div></div>
      </div>
      <p className="text-sm text-gray-500 mt-4">
        Membership history, assigned trainer, and workout plan sections are added in later tasks.
      </p>
    </div>
  );
}
