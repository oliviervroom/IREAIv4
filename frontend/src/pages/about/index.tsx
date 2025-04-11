import { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import Navigation from '../../components/Navigation'

const About: NextPage = () => {
  return (
    <div>
      <Head>
        <title>About - Real Estate Analysis</title>
        <meta name="description" content="About our real estate investment analysis tool" />
      </Head>

      <Navigation />

      <main className="container mx-auto px-4">
        <h1 className="text-4xl font-bold my-8">
          About Us
        </h1>
        
        <p className="mb-4">
          We provide real-time analysis tools for real estate investment decisions.
        </p>

        <Link href="/" className="text-blue-600 hover:underline">
          Back to Home
        </Link>
      </main>
    </div>
  )
}

export default About 