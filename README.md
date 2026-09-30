# HireTrack

> A full-stack career management platform for tracking job applications, managing interviews and resumes, and discovering relevant job opportunities.

## 🌐 Live Demo

**https://hiretrack.ai.studio/**

---

## 📌 Overview

HireTrack is a full-stack web application designed to simplify the job search process by bringing applications, interviews, resumes, saved jobs, and job discovery into a single platform.

The platform allows users to:

- Track job applications
- Manage interview schedules
- Upload and manage resumes
- Analyze resumes
- Discover relevant job opportunities
- Match resumes with job requirements
- Save interesting job postings
- Convert recommended jobs into tracked applications
- Monitor their overall job-search pipeline

---

## ✨ Features

### 🔐 Authentication

- User registration and login
- Secure password hashing
- JWT-based authentication
- Protected API routes
- User-specific data isolation
- Secure logout

### 📋 Job Application Management

Users can manage their complete application pipeline.

- Create applications
- Edit applications
- Delete applications
- Track application status
- Add notes
- Store company information
- Store job titles and locations
- Store original job URLs
- Attach resumes to applications
- Search applications
- Filter applications
- Sort applications

### Application Statuses

- Saved
- Applied
- Interviewing
- Offer
- Accepted
- Rejected
- Withdrawn

---

## 🎤 Interview Management

HireTrack allows users to manage interviews associated with their job applications.

Features include:

- Schedule interviews
- Edit interview information
- Delete interviews
- Track interview status
- Interview type
- Interview duration
- Interviewer information
- Meeting links
- Upcoming interview reminders
- Interview date and time tracking

### Interview Types

- Phone
- Video
- On-site
- Take-home
- Other

### Interview Statuses

- Scheduled
- Completed
- Cancelled
- Rescheduled

---

## 📄 Resume Management

Users can upload and manage their resumes directly from the platform.

Features include:

- PDF resume uploads
- Resume metadata
- Default resume selection
- Rename resumes
- Download resumes
- Delete resumes
- Attach resumes to applications
- Resume validation
- File size validation

Uploaded resumes are validated before being stored.

---

## 🤖 Resume Analysis & Job Matching

HireTrack can analyze a user's resume and extract a structured candidate profile.

The extracted profile can contain:

- Name
- Contact information
- Location
- Skills
- Education
- Experience
- Projects
- Certifications
- Target roles

The candidate profile is then compared with available job requirements.

The matching system provides:

- Match percentage
- Matching skills
- Missing skills
- Match insights
- Ranked recommendations

The goal is to provide an understandable explanation of why a particular job matches a candidate's profile.

---

## 🔎 Job Discovery

HireTrack integrates with the **Adzuna Jobs API** to retrieve live job opportunities.

Users can search for roles using quick filters such as:

- Full Stack
- Frontend
- Backend
- React
- Node.js
- Remote

Job recommendations contain links to the original job posting instead of generated or fabricated application URLs.

---

## 🎯 Job Recommendation System

The recommendation workflow works approximately as follows:

```text
Resume
   ↓
Candidate Profile
   ↓
Skills & Experience Extraction
   ↓
Job Search
   ↓
Job Requirement Extraction
   ↓
Skill Matching
   ↓
Match Percentage
   ↓
Ranked Recommendations

                         HireTrack
                            │
                            ▼
                  ┌───────────────────┐
                  │   React Frontend  │
                  │                   │
                  │ Dashboard         │
                  │ Applications      │
                  │ Interviews        │
                  │ Resumes           │
                  │ Recommendations   │
                  │ Saved Jobs        │
                  └─────────┬─────────┘
                            │
                         REST API
                            │
                            ▼
                  ┌───────────────────┐
                  │  Express Backend  │
                  │                   │
                  │ Authentication    │
                  │ Applications      │
                  │ Interviews        │
                  │ Resumes           │
                  │ Job Matching      │
                  │ External APIs     │
                  └───────┬─────┬─────┘
                          │     │
              ┌───────────┘     └───────────────┐
              ▼                                 ▼
      ┌─────────────────┐              ┌─────────────────┐
      │   PostgreSQL    │              │ External APIs   │
      │                 │              │                 │
      │ Users           │              │ Adzuna          │
      │ Applications    │              │ Gemini          │
      │ Interviews      │              │                 │
      │ Resumes         │              └─────────────────┘
      │ Saved Jobs      │
      └─────────────────┘

👨‍💻 Author

Theic

Full-stack project focused on career management, job discovery, and AI-assisted candidate matching.

📄 License

This project is intended for educational and portfolio purposes.
