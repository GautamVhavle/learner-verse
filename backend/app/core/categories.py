"""Central category configuration - single source of truth for all 17 categories."""

CATEGORIES: list[dict[str, str]] = [
    {"slug": "technology", "name": "Technology", "icon": "Monitor"},
    {"slug": "business", "name": "Business", "icon": "Briefcase"},
    {"slug": "science", "name": "Science", "icon": "FlaskConical"},
    {"slug": "engineering", "name": "Engineering", "icon": "Wrench"},
    {"slug": "mathematics", "name": "Mathematics", "icon": "Calculator"},
    {"slug": "arts-design", "name": "Arts & Design", "icon": "Palette"},
    {"slug": "health", "name": "Health", "icon": "Heart"},
    {"slug": "education", "name": "Education", "icon": "GraduationCap"},
    {"slug": "humanities", "name": "Humanities", "icon": "BookOpen"},
    {"slug": "social-sciences", "name": "Social Sciences", "icon": "Users"},
    {"slug": "languages", "name": "Languages", "icon": "Globe"},
    {"slug": "law", "name": "Law", "icon": "Scale"},
    {"slug": "finance", "name": "Finance", "icon": "TrendingUp"},
    {"slug": "personal-development", "name": "Personal Development", "icon": "Sparkles"},
    {"slug": "lifestyle", "name": "Lifestyle", "icon": "Coffee"},
    {"slug": "test-preparation", "name": "Test Preparation", "icon": "ClipboardCheck"},
    {"slug": "other", "name": "Other", "icon": "MoreHorizontal"},
]

CATEGORY_SLUGS: set[str] = {c["slug"] for c in CATEGORIES}
DEFAULT_CATEGORY = "other"
