import Footer from '../../../../components/footer';
import { GetStaticProps, GetStaticPaths, GetServerSideProps } from 'next'
import * as cookies from "cookie";
import * as jsonwebtoken from "jsonwebtoken";
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

  console.log(authenticated);
  return {
    props: {
      auth: authenticated,
    },
  };
};
interface BlogPageProps {
  auth: boolean;
}

export default function AuthPage({auth}: BlogPageProps) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow flex flex-col items-center justify-center ">
          <h1 className="text-3xl font-bold mb-4">Authentication Page</h1>
        </main>
        <Footer authSense={true} authenticated={auth}/>
      </div>
    );
  }