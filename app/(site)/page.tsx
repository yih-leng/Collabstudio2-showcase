import { getHomeData } from '@/lib/data';
import { HomeView } from './HomeView';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const data = await getHomeData();
  return <HomeView {...data} />;
}
