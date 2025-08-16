import { getSession } from "next-auth/react";

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session) return { redirect: { destination: "/login", permanent: false } };
  if (!session.user.setupCompleted) return { redirect: { destination: "/profile-setup", permanent: false } };
  return { redirect: { destination: "/dashboard", permanent: false } };
}

export default function Home() { return null; }
