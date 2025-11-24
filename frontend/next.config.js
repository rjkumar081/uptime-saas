module.exports = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BACKEND: process.env.NEXT_PUBLIC_BACKEND || "http://localhost:8000"
  }
}
