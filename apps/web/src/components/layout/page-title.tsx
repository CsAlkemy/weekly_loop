import Head from "next/head";

export const PageTitle = ({ title }: { title: string }) => {
  return (
    <Head>
      <title>{`${title} | Weekly Loop`}</title>
    </Head>
  );
};
