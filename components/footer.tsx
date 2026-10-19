import type { NextPage } from 'next'
import { useState } from 'react'

import { deleteCookie } from 'cookies-next';


interface Props {

  authenticated: boolean;
  authSense: boolean


}

const LINKS = [
  { label: "GitHub", href: "https://github.com/jaximus808" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/jaxon-poentis" },
  { label: "X", href: "https://x.com/soljaxonp" },
  { label: "Email", href: "mailto:jaxonp808@gmail.com" },
];

const INPUT =
  "w-full rounded border border-white/15 bg-white/[0.03] px-3 py-2 text-sm font-light text-white outline-none transition-colors duration-300 focus:border-blue-300/60";

const BUTTON =
  "inline-flex items-center text-[0.7rem] uppercase tracking-[0.18em] text-blue-300/80 transition-colors duration-300 hover:text-blue-300";

// The close of every page: the same hairline and Cormorant voice as the page
// titles, a quiet row of links, and a one-line colophon. On the admin page
// (authSense) the login form sits above it.
const Footer: NextPage<Props> = (props) => {

  const [userN, setUserN] = useState("");
  const [pass, setPass] = useState("");
  const [responseText, setResponse] = useState("");


  const LogOut = () => {
    deleteCookie("token");
    location.reload();
  }

  const Login = async (event: any) => {
    event.preventDefault();

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers:
      {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        {
          username: userN,
          pass: pass
        })
    })
    const data = await response.json();
    if (data.authenticated) {
      setAuthEn(true);

      // If there's a redirect query param, go there; otherwise just reload
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get("redirect");
      if (redirectTo) {
        window.location.href = redirectTo;
      } else {
        location.reload();
      }
    }
    else {
      setResponse(data.msg);
    }
  }

  const { authenticated, authSense } = props;

  const [authen, setAuthEn] = useState(authenticated);
  return (
    <footer className="relative z-20 mt-auto pt-24 pb-14 font-montserrat text-white">
      {authSense && (
        <div className="mx-auto mb-20 w-[90%] max-w-xs text-center">
          <p className="text-[0.7rem] uppercase tracking-[0.18em] text-white/60">
            {authen ? "Admin view" : "Admin login"}
          </p>
          {authen ? (
            <button type="button" onClick={LogOut} className={`${BUTTON} mt-5`}>
              Log out
            </button>
          ) : (
            <form onSubmit={Login} className="mt-5 flex flex-col gap-3 text-left">
              <input
                type="text"
                aria-label="Username"
                placeholder="Username"
                value={userN}
                onChange={(e) => setUserN(e.target.value)}
                className={INPUT}
              />
              <input
                type="password"
                aria-label="Password"
                placeholder="Password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className={INPUT}
              />
              {responseText && (
                <p className="text-xs font-light text-white/60">{responseText}</p>
              )}
              <button type="submit" className={`${BUTTON} mt-2 self-center`}>
                Log in
              </button>
            </form>
          )}
        </div>
      )}

      <div className="mx-auto w-[90%] max-w-3xl text-center">
        <div className="mx-auto h-px w-16 bg-white/25" />

        <p className="mt-8 font-cormorant text-3xl font-light">Jaxon Poentis</p>

        <nav aria-label="Elsewhere" className="mt-5 flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              {...(link.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="text-[0.7rem] uppercase tracking-[0.18em] text-white/60 transition-colors duration-300 hover:text-blue-300"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <p className="mt-8 text-[0.7rem] font-light tracking-[0.04em] text-white/35">
          <span suppressHydrationWarning>© {new Date().getFullYear()}</span>
          {" · "}Built with Next.js, MDX &amp; Three.js
        </p>
      </div>
    </footer>
  )
}

export default Footer
