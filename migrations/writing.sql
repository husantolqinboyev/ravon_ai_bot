-- Topics Table
CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL, -- 'writing' or 'test'
    category VARCHAR(100) NOT NULL, -- 'IELTS Task 1', 'Tenses', etc.
    title TEXT NOT NULL,
    description TEXT,
    difficulty VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions Table (MCQ)
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    image_url TEXT,
    options JSONB NOT NULL, -- Array of 4 strings
    correct_option INTEGER NOT NULL, -- 0-3 index
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Results Table
CREATE TABLE IF NOT EXISTS user_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'writing' or 'test'
    topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    score NUMERIC(5, 2), -- 0-100 or IELTS band
    total_questions INTEGER, -- For tests
    correct_answers INTEGER, -- For tests
    content TEXT, -- For writing
    analysis JSONB, -- AI analysis result
    details JSONB, -- For test details
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_topics_type ON topics(type);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_user_results_user ON user_results(user_id);

