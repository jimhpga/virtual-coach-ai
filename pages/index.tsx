import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/upload",
      permanent: false,
    },
  };
};

export default function Home() {
  return null;
}
