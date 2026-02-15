import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Хронометраж печати',
  description: 'Учёт времени и расчёт эффективности труда',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}