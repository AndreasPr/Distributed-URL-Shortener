import React, { useState } from 'react';
import { ArrowLeft, Clock, Calendar, ArrowRight, BookOpen, Share2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../design-system/Card';
import { Badge } from '../design-system/Badge';
import { Button } from '../design-system/Button';
import { mockBlogPosts } from '../mock';
import { BlogPost } from '../mock/types';
import { useToast } from '../context/ToastContext';

export const BlogPage: React.FC = () => {
  const { toast } = useToast();
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', 'Engineering', 'AI & Protocols', 'Architecture'];

  const filteredPosts =
    activeCategory === 'All'
      ? mockBlogPosts
      : mockBlogPosts.filter((p) => p.category === activeCategory);

  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-4 sm:px-6 space-y-10">
      {/* If an article is active, show the Article Template */}
      {selectedPost ? (
        <article className="space-y-8 animate-in fade-in duration-150">
          <button
            onClick={() => setSelectedPost(null)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to all engineering articles</span>
          </button>

          {/* Article Header */}
          <div className="space-y-3 border-b border-slate-200 dark:border-white/10 pb-6">
            <div className="flex items-center gap-2">
              <Badge variant="agent" size="sm">
                {selectedPost.category}
              </Badge>
              <span className="text-xs text-slate-500">·</span>
              <span className="text-xs text-slate-500">{selectedPost.readTime}</span>
              <span className="text-xs text-slate-500">·</span>
              <span className="text-xs text-slate-500">{selectedPost.publishedAt}</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
              {selectedPost.title}
            </h1>

            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
              {selectedPost.summary}
            </p>

            {/* Author Block */}
            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                  alt={selectedPost.author.name}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover border border-slate-300 dark:border-white/20"
                />
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {selectedPost.author.name}
                  </p>
                  <p className="text-[11px] text-slate-500">{selectedPost.author.role}</p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                leftIcon={<Share2 className="w-3.5 h-3.5" />}
                onClick={() => {
                  toast({
                    title: 'Article Link Copied',
                    description: `Copied URL for ${selectedPost.slug}`,
                    variant: 'info',
                  });
                }}
              >
                Share
              </Button>
            </div>
          </div>

          {/* Article Body Content */}
          <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {selectedPost.content.map((paragraph, idx) => (
              <p key={idx} className="leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="pt-8 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setSelectedPost(null)}>
              ← Back to Overview
            </Button>
            <span className="text-xs text-slate-500">
              Published by the Relaymark Engineering Team
            </span>
          </div>
        </article>
      ) : (
        /* Blog List Page */
        <div className="space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <Badge variant="agent" size="sm">
              ENGINEERING WRITING
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Technical Writing & Benchmarks
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              In-depth articles on Anycast BGP routing, Redis replication patterns, and Model Context Protocol architectures.
            </p>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    activeCategory === cat
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Articles List */}
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <Card
                key={post.slug}
                onClick={() => setSelectedPost(post)}
                className="p-6 cursor-pointer hover:border-blue-500/50 transition-colors group space-y-3"
              >
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <Badge variant="default" size="sm">
                    {post.category}
                  </Badge>
                  <span>·</span>
                  <span>{post.readTime}</span>
                  <span>·</span>
                  <span>{post.publishedAt}</span>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    {post.summary}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5 text-xs">
                  <span className="text-slate-500 font-medium">By {post.author.name}</span>
                  <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Read Article <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
