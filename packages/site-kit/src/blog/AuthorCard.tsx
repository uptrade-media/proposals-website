/**
 * @uptrade/site-kit/blog - Author Card Component
 */

import React from 'react'
import type { AuthorCardProps } from './types'

export function AuthorCard({ author, showBio = true, showSocial = true, className }: AuthorCardProps) {
  return (
    <div className={className} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      {author.avatar_url && (
        <img
          src={author.avatar_url}
          alt={author.name}
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            objectFit: 'cover',
          }}
        />
      )}
      <div>
        <h4 style={{ margin: 0 }}>{author.name}</h4>
        {showBio && author.bio && (
          <p style={{ margin: '4px 0', color: '#6b7280', fontSize: 14 }}>{author.bio}</p>
        )}
        {showSocial && author.social_links && (
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            {author.social_links.twitter && (
              <a href={`https://twitter.com/${author.social_links.twitter}`} target="_blank" rel="noopener noreferrer">
                Twitter
              </a>
            )}
            {author.social_links.linkedin && (
              <a href={author.social_links.linkedin} target="_blank" rel="noopener noreferrer">
                LinkedIn
              </a>
            )}
            {author.social_links.github && (
              <a href={`https://github.com/${author.social_links.github}`} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
