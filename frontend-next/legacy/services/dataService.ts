import { fetchApi } from './apiClient';
import { type Profile, type SuccessStory, type Testimonial, type MembershipPlan, type Conversation, type Message, type BlogPost } from '../types/domain';

type UserWire = Record<string, any> & { id: string };
const demoPortraits = [
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=82',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=82',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=82',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=82',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=82',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=900&q=82',
];
const portraitFor = (id: string) => demoPortraits[[...id].reduce((total, char) => total + char.charCodeAt(0), 0) % demoPortraits.length];
const profileFromWire = (user: UserWire): Profile => ({
  id: user.id,
  name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Member',
  age: user.age || 0,
  height: user.height || 'Not specified',
  religion: user.religion || 'Not specified',
  caste: user.caste || 'Not specified',
  education: user.highest_education || 'Not specified',
  occupation: user.occupation || 'Not specified',
  income: user.annual_income || 'Not specified',
  location: user.work_location || 'Not specified',
  // Development seed photos are intentionally replaced by varied online
  // portraits so the browse and gallery views do not repeat one image.
  photo: String(user.photo || '').includes('/seed_') ? portraitFor(user.id) : (user.photo || portraitFor(user.id)),
  verified: Boolean(user.is_verified),
  premium: Boolean(user.is_premium),
  compatibility: Number(user.compatibility || 0),
  about: user.about || 'This member has not added an introduction yet.',
  familyType: user.family_type || 'Not specified',
  motherTongue: user.mother_tongue || 'Not specified',
  maritalStatus: user.marital_status || 'Not specified',
  hobbies: Array.isArray(user.hobbies) ? user.hobbies : [],
  partnerPrefs: user.pref_about || 'Not specified',
  chat_public_key: user.chat_public_key,
  is_unlocked: Boolean(user.is_unlocked),
});

export const getProfiles = async (params?: Record<string, string>): Promise<{ results: Profile[] }> => {
  const page = await fetchApi<{ results: UserWire[] }>('/profiles/', { params });
  return { ...page, results: page.results.map(profileFromWire) };
};

export const getProfile = async (id: string): Promise<Profile> => {
  const res = await fetchApi<any>(`/profiles/${id}/`);
  if (res && res.profile) {
    const p = profileFromWire(res.profile);
    p.access = res.access;
    return p;
  }
  return profileFromWire(res);
};

export const getMembershipPlans = async (): Promise<MembershipPlan[]> => {
  return fetchApi<MembershipPlan[]>('/membership-plans/');
};

export const getSuccessStories = async (): Promise<SuccessStory[]> => {
  const rows = await fetchApi<Array<Record<string, any>>>('/success-stories/');
  return rows.map((row) => ({ ...row, coupleNames: row.couple_names } as SuccessStory));
};

export const getTestimonials = async (): Promise<Testimonial[]> => {
  return fetchApi<Testimonial[]>('/testimonials/');
};

export const getBlogPosts = async (): Promise<BlogPost[]> => {
  return fetchApi<BlogPost[]>('/blogposts/');
};

export const getFAQs = async (): Promise<any[]> => {
  return fetchApi<any[]>('/faqs/');
};

export const getConversations = async (): Promise<Conversation[]> => {
  const rows = await fetchApi<Array<Record<string, any>>>('/conversations/');
  return rows.map((row) => ({ ...row, profile: profileFromWire(row.profile) } as Conversation));
};

export const getMessages = async (userId: string): Promise<Message[]> => {
  return fetchApi<Message[]>(`/conversations/${userId}/messages/`);
};

export const sendMessage = async (userId: string, text: string): Promise<Message> => {
  return fetchApi<Message>(`/conversations/${userId}/messages/`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
};

export const getInterests = async (type: 'incoming' | 'outgoing' = 'incoming'): Promise<any[]> => {
  return fetchApi<any[]>(`/interests/?type=${type}`);
};

export const sendInterest = async (receiverId: string): Promise<any> => {
  return fetchApi<any>('/interests/', {
    method: 'POST',
    body: JSON.stringify({ receiver_id: receiverId }),
  });
};

export const updateInterestStatus = async (interestId: string, status: 'ACCEPTED' | 'DECLINED'): Promise<any> => {
  return fetchApi<any>(`/interests/${interestId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
};

export const checkCompatibility = async (data: any): Promise<any> => {
  return fetchApi<any>('/matchmaking/compatibility/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getShortlists = async (): Promise<{ count: number; results: Profile[] }> => {
  const data = await fetchApi<{ count?: number; results?: any[] } | any[]>('/shortlists/');
  const rows = Array.isArray(data) ? data : data.results ?? [];
  return { count: Array.isArray(data) ? rows.length : data.count ?? rows.length, results: rows.map(profileFromWire) };
};

export const toggleShortlist = async (profileId: string): Promise<{ success: boolean; action: 'added' | 'removed'; shortlisted: boolean }> => {
  return fetchApi<any>('/shortlists/', {
    method: 'POST',
    body: JSON.stringify({ profile_id: profileId }),
  });
};

export const isProfileShortlisted = async (profileId: string): Promise<boolean> => {
  try {
    const data = await fetchApi<{ results?: any[] } | any[]>('/shortlists/');
    const rows = Array.isArray(data) ? data : data.results ?? [];
    return rows.some((u: any) => u.id === profileId);
  } catch {
    return false;
  }
};

export const verifyPayment = async (paymentData: { payment_id: string; order_id: string; plan_slug: string }): Promise<any> => {
  return fetchApi<any>('/payments/verify/', {
    method: 'POST',
    body: JSON.stringify(paymentData),
  });
};
