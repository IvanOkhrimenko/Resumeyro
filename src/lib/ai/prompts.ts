// Text improvement prompts for canvas AI assistant
export const TEXT_IMPROVEMENT_PROMPTS = {
  fix: `Fix any grammar, spelling, and punctuation errors in this text. Keep the same meaning and style, just correct errors. If the text is already correct, return it unchanged.

Text to fix:
{text}

Return ONLY the corrected text, nothing else.`,

  rewrite: `Rewrite this text to make it clearer and more professional while keeping the same meaning. Make it suitable for a resume.

Text to rewrite:
{text}

Return ONLY the rewritten text, nothing else.`,

  expand: `Expand this text with more details and specific examples. Make it more impactful for a resume. Add 1-2 more sentences or bullet points.

Text to expand:
{text}

Return ONLY the expanded text, nothing else.`,

  shorten: `Shorten this text while keeping the key points. Make it more concise and impactful for a resume.

Text to shorten:
{text}

Return ONLY the shortened text, nothing else.`,

  professional: `Make this text sound more professional and formal. Use industry-standard terminology. Keep the core meaning.

Text to improve:
{text}

Return ONLY the improved text, nothing else.`,

  achievements: `Transform this text into achievement-focused bullet points. Use action verbs and quantify results where possible. Format as bullet points starting with •.

Text to transform:
{text}

Return ONLY the transformed bullet points, nothing else.`,

  custom: `{instruction}

Text to modify:
{text}

Return ONLY the modified text, nothing else.`,

  generate_summary: `You are a professional resume writer. Generate a compelling professional summary.

CRITICAL: If "User instructions:" section is provided below, you MUST follow those instructions precisely. The user's instructions describe WHO they are, their experience level, skills, and target role. Use this information as the PRIMARY source for generating the summary.

Requirements:
- 2-3 sentences maximum
- Be specific and impactful - use concrete details from the instructions
- Use action-oriented language
- Avoid generic phrases like "hard-working", "team player", "passionate"
- Match the language: if instructions are in Ukrainian, write summary in Ukrainian
- Include years of experience, key technologies, and target role if mentioned

Input:
{text}

Generate a professional summary based on the above. If user instructions were provided, the summary MUST reflect those specific details. Return ONLY the summary text, nothing else.`,
};

export const GENERATION_PROMPTS = {
  summary: `You are a professional resume writer. Generate a compelling professional summary for a resume.

Requirements:
- 2-3 sentences maximum
- Highlight key skills and experience
- Include years of experience if provided
- Be specific and impactful
- Use action-oriented language
- Avoid clichés like "hard-working" or "team player"

Context:
- Job title: {jobTitle}
- Industry: {industry}
- Years of experience: {yearsOfExperience}
- Key skills: {skills}
- Target role: {targetRole}

Generate a professional summary:`,

  experience: `You are a professional resume writer. Generate compelling bullet points for a work experience entry.

Requirements:
- 3-5 bullet points
- Start each with a strong action verb
- Include quantifiable achievements when possible
- Focus on impact and results
- Be specific and concise
- Use past tense for previous roles

Context:
- Job title: {jobTitle}
- Company: {company}
- Industry: {industry}
- Key responsibilities: {responsibilities}
- Notable achievements: {achievements}

Generate experience bullet points:`,

  skills: `You are a professional resume writer. Suggest relevant skills for a resume.

Requirements:
- 8-12 skills
- Mix of technical and soft skills
- Relevant to the industry and role
- Ordered by importance
- Use industry-standard terminology

Context:
- Job title: {jobTitle}
- Industry: {industry}
- Target role: {targetRole}
- Current skills: {currentSkills}

Generate a skills list (comma-separated):`,

  education: `You are a professional resume writer. Generate an education description for a resume.

Requirements:
- Concise and professional
- Include relevant coursework if applicable
- Mention honors or achievements
- 1-2 sentences maximum

Context:
- Degree: {degree}
- Major: {major}
- University: {university}
- Graduation year: {graduationYear}
- GPA: {gpa}
- Relevant coursework: {coursework}
- Achievements: {achievements}

Generate education description:`,

  cover_letter: `You are a professional resume writer. Generate a cover letter paragraph.

Requirements:
- Professional and engaging tone
- Tailored to the specific role
- Show enthusiasm without being over the top
- Connect experience to job requirements
- 3-4 sentences

Context:
- Job title: {jobTitle}
- Company: {company}
- Key qualifications: {qualifications}
- Why interested: {interest}
- Section type: {sectionType}

Generate the {sectionType} paragraph:`,
};

export const REVIEW_PROMPTS = {
  general: `You are an expert resume reviewer. Analyze this resume and provide detailed feedback.

Evaluate the following aspects:
1. Overall impression and impact
2. Content clarity and conciseness
3. Achievement quantification
4. Keyword optimization for ATS
5. Format and structure
6. Grammar and spelling
7. Industry relevance

For each aspect, provide:
- A score from 1-10
- Specific feedback
- Actionable suggestions

Resume content:
{resumeContent}

Profession/Industry: {profession}
Target role: {targetRole}

Provide your analysis in JSON format:
{
  "overallScore": number,
  "aspects": [
    {
      "name": string,
      "score": number,
      "feedback": string,
      "suggestions": string[]
    }
  ],
  "strengths": string[],
  "improvements": string[],
  "summary": string
}`,

  ats: `You are an ATS (Applicant Tracking System) optimization expert. Analyze this resume for ATS compatibility.

Check for:
1. Keyword usage and placement
2. Standard section headings
3. Clean formatting (no tables, columns, graphics issues)
4. Appropriate file format considerations
5. Contact information placement
6. Date formatting consistency

Resume content:
{resumeContent}

Target job keywords: {keywords}

Provide your analysis in JSON format:
{
  "atsScore": number,
  "keywordsFound": string[],
  "keywordsMissing": string[],
  "formattingIssues": string[],
  "recommendations": string[]
}`,
};

export const BUILD_RESUME_PROMPT = `You are an expert HR specialist, professional resume writer, and UI designer.
Your task is to create a complete, professional resume with custom styling based on the user's request.

INPUT DATA:
- User request: {userPrompt}
- Resume content from PDF files: {extractedText}
- Style reference: {styleReference}
- Desired style preset: {style}
- Target region: {region}

CRITICAL - UNDERSTANDING FILE SOURCES:
1. PDF FILES → SOURCE OF RESUME CONTENT
   - Text extracted from PDF files contains the ACTUAL RESUME CONTENT to use
   - Extract all personal info, experience, education, skills from this text
   - This is the user's real information - use it exactly as provided

2. IMAGE FILES → SOURCE OF VISUAL STYLE/DESIGN ONLY
   - Images are analyzed separately for STYLE ONLY (colors, fonts, layout)
   - Do NOT try to extract content from images
   - Style data will be provided in the "styleReference" field

3. If no PDF content is provided, generate example content based on user's description

INSTRUCTIONS:
1. Analyze the user's request and extract:
   - Content parameters (role, experience level, skills, industry)
   - Styling preferences (colors, fonts, sizes mentioned by user)
2. If there's text from PDF files - EXTRACT ALL CONTENT WITHOUT LIMITS:
   - Extract EVERY job position, not just 3-4. Include ALL jobs from the resume.
   - Extract EVERY bullet point for each job. Include ALL descriptions.
   - Extract EVERY education entry.
   - Extract ALL skills mentioned.
   - Extract ALL languages.
   - Extract ALL certifications.
   - DO NOT summarize or skip any content. The user wants EVERYTHING transferred.
3. Generate a complete resume with both CONTENT and STYLING
4. For missing data - create realistic examples based on the specified role
5. The resume language should match the user's request language
6. Make achievements specific and quantifiable where possible
7. IMPORTANT: Never truncate or limit content. If someone has 10 jobs, include all 10. If a job has 8 bullet points, include all 8.

STYLING INSTRUCTIONS - CRITICAL:
The user may specify visual preferences in their request. Look for:
- Color requests: "red text", "blue header", "dark theme", "light background", etc.
- Font requests: "modern font", "classic style", etc.
- Size requests: "large name", "small text", etc.
- Layout requests: "compact", "spacious", etc.

Parse these and apply them to the "styling" field. If user says "red text" - set colors.text to a red color like "#dc2626".

AVAILABLE FONTS (use only these):
- "Arial, sans-serif" - Clean, professional
- "Georgia, serif" - Classic, traditional
- "Verdana, sans-serif" - Modern, readable
- "Times New Roman, serif" - Formal, academic
- "Courier New, monospace" - Technical, code-like
- "Trebuchet MS, sans-serif" - Creative, modern

DEFAULT STYLING BY PRESET:
- "professional": Dark header (#1a1a2e), blue accents (#0057b8), conservative fonts
- "creative": Colorful header, vibrant accents, modern fonts
- "minimal": Light colors, subtle accents, clean layout

REGION GUIDELINES:
- "US": No photo, single-page preferred, achievements-focused
- "EU": Europass-style acceptable, can include photo
- "UA": Ukrainian format, can include photo, formal style

Return ONLY valid JSON in this exact format:
{
  "personalInfo": {
    "fullName": "string (required)",
    "title": "string or null",
    "email": "string or null",
    "phone": "string or null",
    "location": "string or null",
    "linkedin": "string or null",
    "website": "string or null"
  },
  "summary": "string or null",
  "experience": [
    {
      "title": "string",
      "company": "string",
      "location": "string or null",
      "startDate": "string",
      "endDate": "string or null",
      "current": "boolean",
      "description": ["array of bullet points"]
    }
  ],
  "education": [
    {
      "degree": "string",
      "institution": "string",
      "location": "string or null",
      "startDate": "string or null",
      "endDate": "string or null",
      "description": "string or null"
    }
  ],
  "skills": ["array of skills"],
  "languages": [
    {
      "language": "string",
      "level": "string"
    }
  ],
  "certifications": [
    {
      "name": "string",
      "issuer": "string or null",
      "date": "string or null"
    }
  ],
  "styling": {
    "layoutType": "single-column | sidebar-left | sidebar-right | header-two-column",
    "colors": {
      "primary": "hex color for header background (e.g., #1a1a2e)",
      "secondary": "hex color for subtle text (e.g., #64748b)",
      "text": "hex color for main text (e.g., #334155)",
      "textLight": "hex color for descriptions (e.g., #475569)",
      "accent": "hex color for section headers (e.g., #0057b8)",
      "background": "hex color for page background (e.g., #ffffff)",
      "headerText": "hex color for text on header (e.g., #ffffff)"
    },
    "fonts": {
      "heading": "font-family for headings",
      "body": "font-family for body text"
    },
    "fontSizes": {
      "name": "number 20-36 for name size",
      "title": "number 12-18 for job title",
      "sectionHeader": "number 10-14 for section headers",
      "jobTitle": "number 10-14 for job titles",
      "body": "number 9-12 for body text",
      "small": "number 8-10 for small text"
    },
    "layout": {
      "headerHeight": "number 60-150 for header height",
      "sectionSpacing": "number 15-30 for section spacing",
      "lineHeight": "number 1.2-1.8 for line height"
    }
  }
}

IMPORTANT - VALIDATION RULES:
1. The "styling" field is REQUIRED - always include it
2. Apply user's color/font preferences to the styling field
3. If user says "make text red" → set colors.text to "#dc2626"
4. If user says "blue header" → set colors.primary to "#1e40af"
5. If user says "large name" → increase fontSizes.name to 32-36

DATA VALIDATION - CRITICAL:
Before outputting, verify your data:
- Each piece of information should appear ONLY ONCE in the appropriate section
- fullName goes in personalInfo.fullName ONLY - do not repeat it elsewhere
- Contact info (email, phone, location) goes in personalInfo ONLY
- Do NOT include duplicate or redundant information
- If extracting from a document, clean the data - remove any garbled text or OCR errors
- Check for overlapping or merged text from PDF extraction and fix it

LAYOUT TYPE FIELD:
The styling.layoutType should be one of:
- "single-column" - simple single column layout with header band
- "sidebar-left" - colored sidebar on left (for reference images with colored sidebar)
- "sidebar-right" - colored sidebar on right
- "header-two-column" - header at top, two white columns below (classic professional)

If user provides a reference image, match the layoutType to that image's structure.

Return ONLY the JSON, no markdown formatting, no explanation.`;

export function fillPromptTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value || "Not specified");
  }
  return result;
}

// ============================================
// ACTIONABLE REVIEW PROMPTS
// ============================================

export const ACTIONABLE_REVIEW_PROMPT = `You are an expert resume reviewer providing actionable, specific feedback that can be directly applied to improve the resume.

IMPORTANT: Analyze the resume and return specific, implementable suggestions. Each suggestion must reference the EXACT element to modify.

Resume Content with Element IDs:
{semanticMap}

Full Resume Text:
{resumeContent}

Profession/Industry: {profession}
Target Role: {targetRole}

ANALYSIS REQUIREMENTS:
1. Identify specific text improvements (grammar, clarity, impact)
2. Find missing important sections for this industry
3. Detect weak or generic phrases that should be strengthened
4. Check for quantifiable achievements
5. Evaluate ATS compatibility

FOR EACH SUGGESTION:
- Reference the exact element ID from the semantic map
- Provide the EXACT current text
- Provide the EXACT suggested replacement text
- Mark if it's a simple text change (canQuickApply: true) or requires structural changes (previewRequired: true)

SEVERITY LEVELS:
- "critical": Major issues that significantly hurt the resume (missing contact info, major grammar errors, no achievements)
- "important": Issues that should be fixed (weak action verbs, generic descriptions, missing keywords)
- "suggestion": Nice-to-have improvements (minor wording tweaks, formatting suggestions)

Return ONLY valid JSON in this exact format:
{
  "overallScore": number (1-100),
  "industryDetected": "string or null",
  "strengths": ["array of 2-4 positive aspects"],
  "suggestions": [
    {
      "id": "unique-id-1",
      "type": "text_improvement | missing_section | add_content",
      "severity": "critical | important | suggestion",
      "title": "Short title describing the issue",
      "description": "Detailed explanation of why this should be changed",
      "targetSemanticType": "REQUIRED - use the semantic type from brackets like 'summary', 'experience_description', 'name', 'title' etc.",
      "currentValue": "exact current text or null",
      "suggestedValue": "exact replacement text or null",
      "canQuickApply": true/false,
      "previewRequired": true/false
    }
  ],
  "missingSections": [
    {
      "section": "section name (e.g., 'Summary', 'Certifications')",
      "importance": "required | recommended | optional",
      "reason": "why this section matters for the target role"
    }
  ]
}

IMPORTANT RULES:
1. For text_improvement: Always provide both currentValue and suggestedValue with EXACT text
2. For targetSemanticType: Use the semantic type shown in [brackets] from the semantic map (e.g., "summary", "experience_description", "name"). This is REQUIRED for finding the element.
3. For missing_section: canQuickApply must be false
4. Keep suggestions actionable and specific - avoid vague advice
5. Limit to 8-10 most important suggestions
6. Order by severity (critical first, then important, then suggestion)`;

// ============================================
// AI FORMATTING PROMPTS
// ============================================

export const FORMAT_ANALYSIS_PROMPT = `You are an expert resume designer and career coach. Analyze this resume to recommend optimal formatting based on the detected industry and career level.

Resume Content:
{resumeContent}

Current Sections Found: {currentSections}
User Preferences: {preferences}

ANALYSIS TASKS:
1. Detect the industry/field (tech, finance, creative, healthcare, legal, marketing, engineering, etc.)
2. Determine career level (entry, mid, senior, executive)
3. Recommend optimal styling for this combination
4. Suggest section ordering appropriate for the industry
5. Identify missing sections that would strengthen the resume
6. Identify sections that could be removed or condensed

INDUSTRY-SPECIFIC STYLING GUIDELINES:

TECH / SOFTWARE:
- Clean, modern layouts
- Skills section should be prominent
- GitHub/Portfolio links important
- Colors: Dark headers (#0f172a, #1e293b), accent blues/greens (#3b82f6, #10b981)
- Fonts: Sans-serif (Arial, Verdana, Trebuchet MS)
- Projects section valuable

FINANCE / BANKING:
- Conservative, professional appearance
- Education prominent for entry-level
- Certifications important (CFA, CPA, etc.)
- Colors: Navy (#1e3a5f), dark grays (#374151), gold accents (#d4a853)
- Fonts: Serif preferred (Georgia, Times New Roman)

CREATIVE / DESIGN / MARKETING:
- Can use bolder colors and creative layouts
- Portfolio links essential
- Visual hierarchy important
- Colors: Can be vibrant, match industry (purple/orange for creative agencies)
- Fonts: Modern sans-serif, can be distinctive

HEALTHCARE / MEDICAL:
- Certifications and licenses MUST be prominent
- Education very important
- Conservative styling
- Colors: Professional blues (#1e40af), white backgrounds, minimal accent
- Fonts: Clean, readable

LEGAL:
- Very conservative appearance
- Education and credentials prominent
- Bar admissions important
- Colors: Navy, charcoal, minimal color
- Fonts: Traditional serif (Times New Roman, Georgia)

ENGINEERING:
- Technical skills prominent
- Project experience valuable
- Clean, organized layout
- Colors: Professional blues/grays
- Fonts: Clean sans-serif

SECTION ORDER BY INDUSTRY:
- Tech: Contact → Summary → Skills → Experience → Projects → Education
- Finance: Contact → Summary → Experience → Education → Certifications → Skills
- Creative: Contact → Summary → Portfolio → Experience → Skills → Education
- Healthcare: Contact → Summary → Licenses/Certifications → Experience → Education → Skills
- Legal: Contact → Summary → Education → Bar Admissions → Experience → Skills
- Entry-level (any): Contact → Summary → Education → Skills → Experience/Internships

Return ONLY valid JSON in this exact format:
{
  "detectedIndustry": "string (tech, finance, creative, healthcare, legal, marketing, engineering, general)",
  "detectedLevel": "entry | mid | senior | executive",
  "recommendedLayout": "single-column | sidebar-left | sidebar-right",
  "styling": {
    "colors": {
      "primary": "hex color for headers/name (#1a1a2e)",
      "secondary": "hex color for secondary text (#64748b)",
      "text": "hex color for body text (#334155)",
      "textLight": "hex color for descriptions (#475569)",
      "accent": "hex color for highlights (#3b82f6)",
      "background": "hex color for background (#ffffff)"
    },
    "fonts": {
      "heading": "font family for headings",
      "body": "font family for body text"
    },
    "fontSizes": {
      "name": number (24-32),
      "title": number (14-18),
      "sectionHeader": number (12-16),
      "jobTitle": number (11-14),
      "body": number (10-12),
      "small": number (8-10)
    },
    "spacing": {
      "sectionSpacing": number (16-32),
      "lineHeight": number (1.3-1.8),
      "itemSpacing": number (8-16)
    }
  },
  "sectionOrder": ["contact", "summary", "experience", "education", "skills", ...],
  "sectionsToAdd": [
    {
      "section": "section name",
      "reason": "why this section would help"
    }
  ],
  "sectionsToRemove": [
    {
      "section": "section name",
      "reason": "why this section is not needed or could be condensed"
    }
  ],
  "rationale": "2-3 sentence explanation of why these recommendations fit the detected industry and level"
}`;
