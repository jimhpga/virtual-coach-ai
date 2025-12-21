export const getServerSideProps = async () => {
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
