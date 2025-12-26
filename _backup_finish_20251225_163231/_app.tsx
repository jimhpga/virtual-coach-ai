import type { AppProps } from "next/app";
import React from "react";
import SiteNav from "../components/SiteNav";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <SiteNav />
      <Component {...pageProps} />
    </>
  );
}
