# LPU Laguna Reservation System - Admin Dashboard

A modern, professional university reservation management system for LPU Laguna built with Angular and Tailwind CSS.

## 🎨 Design System

### Color Palette
- **Primary Maroon**: `#8B0000` - Main brand color
- **Maroon Light**: `#A01010` - Hover states
- **Maroon Dark**: `#6B0000` - Active states
- **Gold**: `#FFD700` - Accent color
- **White**: `#FFFFFF` - Neutral background
- **Light Gray**: `#F5F5F5` - Secondary background

### Typography
- Font Family: System fonts with fallback to sans-serif
- Headlines: Bold (700)
- Body: Regular (400)
- Labels: Semibold (600)

### Components
- **Rounded Corners**: 12px on cards, 8px on form elements
- **Shadows**: Soft shadows for elevation
- **Spacing**: 6px base unit system
- **Responsive**: Mobile-first approach with Tailwind breakpoints

## 📁 Project Structure

```
src/app/
├── admin/
│   ├── admin.ts                      # Main admin layout component
│   ├── components/
│   │   ├── admin-header.component.ts # Top navigation bar
│   │   ├── admin-sidebar.component.ts# Left sidebar navigation
│   │   ├── stats-card.component.ts   # Dashboard stat card component
│   │   ├── recent-reservations.component.ts
│   │   └── chart.component.ts        # Chart visualization
│   └── pages/
│       ├── dashboard.component.ts    # Main dashboard
│       ├── reservations.component.ts # Reservations management
│       ├── calendar.component.ts     # Calendar view
│       ├── reports.component.ts      # Reports and analytics
│       └── users.component.ts        # User management
├── app.ts                            # Root app component
├── app.routes.ts                     # Application routes
├── app.config.ts                     # App configuration
└── styles.css                        # Global styles
```

## 🖥️ Pages

### 1. Dashboard
The main overview page with:
- **Key Metrics**: Total reservations, pending requests, approved, rejected
- **Charts**: 
  - Monthly reservation trends (line chart)
  - Facility distribution (pie chart)
- **Recent Reservations Table**: Quick access to latest bookings
- **Call-to-Action**: New reservation button

### 2. Reservations Management
Advanced reservation management interface:
- **Filters**: Service type, status, date range
- **Data Table**: Comprehensive reservation listing with all details
- **Actions**: View, approve, reject, edit
- **Status Tracking**: Color-coded status indicators
- **Pagination**: Navigate through records

### 3. Calendar View
Facility booking calendar:
- **Month/Week/Day Views**: Flexible viewing options
- **Service Filter**: Filter by facility type
- **Event Display**: Color-coded facility bookings
- **Interactive**: Hover for event details

### 4. Reports & Analytics
Comprehensive analytics dashboard:
- **Key Metrics**: Total reservations, most requested facility, approval rate
- **Charts**:
  - Bar chart: Reservations per service
  - Line chart: Monthly trends
  - Pie chart: Facility distribution
- **Export Options**: PDF, Excel, CSV
- **Top Requesters Table**: Most active users

### 5. User Management
System user administration:
- **User List**: All system users with details
- **Search & Filter**: By role, status, department
- **Actions**: 
  - Add new user
  - Edit user details
  - Reset password
  - Enable/disable user
- **Role Types**:
  - Student
  - Faculty
  - Facilities Office
  - EO Office
  - Future Skills Office
  - Administrator

## 🎯 Key Features

### Header Component
- LPU Logo and system title
- User profile section with avatar
- Notifications badge
- Logout button
- Responsive mobile menu toggle

### Sidebar Navigation
- Logo and system branding
- Navigation menu with active state
- Badge counters for pending items
- Settings and logout at bottom
- Collapsible on mobile

### Stats Cards
- Icon with background color
- Title and value
- Trend indicator (up/down with percentage)
- Hover effect for interactivity

### Data Tables
- Sortable columns
- Row selection checkboxes
- Action buttons
- Status badges with color coding
- Pagination

### Status Colors
- **Pending**: Orange (`#FF9800`)
- **Approved**: Green (`#10B981`)
- **Rejected**: Red (`#EF4444`)
- **Completed**: Blue (`#3B82F6`)

## 🚀 Getting Started

### Installation
```bash
npm install
```

### Development Server
```bash
npm start
```
Navigate to `http://localhost:4200/`

### Build
```bash
npm run build
```

## 📊 Responsive Design

### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Mobile Features
- Collapsible sidebar
- Stack layout for cards
- Optimized table views
- Touch-friendly buttons

## 🔧 Technologies Used

- **Framework**: Angular 21
- **Styling**: Tailwind CSS 4.x
- **Language**: TypeScript
- **Build**: Angular CLI

## 📝 Color Usage Guide

### Primary Actions
Use maroon (`#8B0000`) for:
- Primary buttons
- Active navigation items
- Important links
- Status badges for maroon-related items

### Secondary Information
Use gray for:
- Text content
- Borders
- Dividers
- Disabled states

### Status Indicators
Use semantic colors:
- Green for success/approved
- Orange for pending/warning
- Red for danger/rejected
- Blue for information/completed

## 🎨 Component Examples

### Creating a New Stats Card
```html
<app-stats-card
  title="Your Metric"
  value="123"
  change="+5.2%"
  positive="true"
  icon="chart"
  color="blue"
></app-stats-card>
```

### Adding a New Route
Update `app.routes.ts`:
```typescript
{
  path: 'your-page',
  component: YourPageComponent
}
```

Add navigation link in sidebar (update `admin-sidebar.component.ts`)

## 📱 Accessibility Features

- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- Color contrast compliance
- Focus indicators on all interactive elements

## 🔐 User Roles & Permissions

The system supports multiple user roles:
- **Student**: Can create and view own reservations
- **Faculty**: Can create and manage departmental reservations
- **Facilities Office**: Can approve/reject reservations
- **EO Office**: Special privileges for events
- **Future Skills Office**: Training facility management
- **Administrator**: Full system access

## 📞 Support

For issues or questions about the admin dashboard, please contact the development team.

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Built for**: LPU Laguna
