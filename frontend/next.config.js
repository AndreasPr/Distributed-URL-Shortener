if (process.env.VERCEL_ENV === 'production' && process.env.NEXT_PUBLIC_LOCAL_AUTH === 'true') throw new Error('LocalAuth must not be deployed publicly')
/** @type {import('next').NextConfig} */
module.exports = { reactStrictMode: true }
