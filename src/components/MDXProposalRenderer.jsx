import { useEffect, useState } from 'react'
import { evaluate } from '@mdx-js/mdx'
import * as runtime from 'react/jsx-runtime'
import { mdxComponents } from './mdx/ProposalBlocks'
import ProposalLayout from './ProposalLayout'

export default function MDXProposalRenderer({ mdxSource, meta = {} }) {
  const [MDXContent, setMDXContent] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function compileMDX() {
      try {
        const { default: Content } = await evaluate(mdxSource, {
          ...runtime,
          development: false,
          useMDXComponents: () => mdxComponents
        })
        setMDXContent(() => Content)
      } catch (err) {
        console.error('MDX compilation error:', err)
        setError(err.message)
      }
    }

    if (mdxSource) {
      compileMDX()
    }
  }, [mdxSource])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-red-50 border border-red-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-red-800 mb-4">MDX Compilation Error</h2>
          <pre className="text-sm text-red-700 overflow-auto">
            {error}
          </pre>
        </div>
      </div>
    )
  }

  if (!MDXContent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading proposal...</p>
        </div>
      </div>
    )
  }

  return (
    <ProposalLayout meta={meta}>
      <MDXContent components={mdxComponents} />
    </ProposalLayout>
  )
}
