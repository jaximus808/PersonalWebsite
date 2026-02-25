import Footer from '../../../../components/footer';
import { GetStaticProps, GetStaticPaths, GetServerSideProps } from 'next'
import * as cookies from "cookie";
import * as jsonwebtoken from "jsonwebtoken";
import { useRouter } from 'next/router';
import { useEffect } from 'react';

type props = {
  blogs: any;
  auth: boolean;
};

const BLOGS_PER_PAGE = 6;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const parsedCookies = cookies.parse(
    context.req.headers.cookie ? context.req.headers.cookie : ""
  );

  const token = parsedCookies.token;

  let authenticated = false;
  if (!token) {
    authenticated = false;
  } else {
    try {
      jsonwebtoken.verify(token, process.env.ADMIN_PASS!);
      authenticated = true;
    } catch {
      authenticated = false;
    }
  }

  // If already authenticated and there's a redirect query, go there immediately
  const redirect = (context.query.redirect as string) || "";
  if (authenticated && redirect) {
    return {
      redirect: { destination: redirect, permanent: false },
    };
  }

  console.log(authenticated);
  return {
    props: {
      auth: authenticated,
      redirectTo: redirect,
    },
  };
};
interface BlogPageProps {
  auth: boolean;
  redirectTo?: string;
}

export default function AuthPage({ auth, redirectTo }: BlogPageProps) {
  const router = useRouter();

  // If we just logged in via the footer and there's a redirect, go there
  useEffect(() => {
    if (auth && redirectTo) {
      router.push(redirectTo);
    }
  }, [auth, redirectTo, router]);

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold mb-4">Authentication Page</h1>

        {/* Show finance link when logged in */}
        {auth && (
          <div className="flex flex-col items-center gap-3 mt-4">
            <p className="text-gray-400 text-sm">You are logged in as admin.</p>
            <a
              href="/admin/finance"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg px-5 py-2.5 transition-colors"
            >
              💰 Open Finance Tracker
            </a>
          </div>
        )}
      </main>
      <Footer authSense={true} authenticated={auth} />
    </div>
  );
}