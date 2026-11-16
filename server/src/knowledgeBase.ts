export interface CampusFact {
  category: string;
  topic: string;
  keywords: string[];
  answer: string;
}

export const CAMPUS_GROUNDED_FACTS: CampusFact[] = [
  {
    category: "Academic Policy",
    topic: "Attendance Requirement & Condonation",
    keywords: ["attendance", "minimum attendance", "condonation", "shortage", "detained", "75%"],
    answer: "Smart Campus University mandates a minimum of 75% attendance in each registered theory and laboratory course to be eligible to appear for the end-semester examinations. Students with attendance between 65% and 74% may apply for medical condonation subject to submitting medical certificates approved by the University Health Officer and Department HOD within 7 working days. Students below 65% attendance are strictly detained from appearing in that course exam."
  },
  {
    category: "Faculty Directory",
    topic: "Dr. Guru Prasad",
    keywords: ["priya", "raman", "algorithms", "ada", "cabin", "office hours", "room 304"],
    answer: "Dr. Priya Raman is an Head Of Department in the Department of Computer Science & Engineering. His cabin is L 101 on the ground Floor of the Left Wing Engineering Block. Office hours for student counseling and project discussions are Mondays, Wednesdays, and Fridays from 2:00 PM to 4:00 PM. He teaches BCS401 (Analysis and Design of Algorithms)."
  },
  {
    category: "Faculty Directory",
    topic: "Prof. K. Venkatesh",
    keywords: ["venkatesh", "dbms", "database", "cabin", "office hours", "room 312"],
    answer: "Prof. K. Venkatesh is an Assistant Professor in the Department of Computer Science & Engineering. His cabin is Room 312 on the 3rd Floor of the Alan Turing Engineering Block. Office hours are Tuesdays and Thursdays from 10:00 AM to 12:30 PM. He teaches BCS403 (Database Management Systems)."
  },
  {
    category: "Administration",
    topic: "Dean of Academic Affairs - Dr. Rajesh Verma",
    keywords: ["dean", "rajesh", "verma", "admin", "office", "suite 101"],
    answer: "Dr. Rajesh Verma is the Dean of Academic Affairs. His office is located in the Administrative Central Block, Suite 101 (Ground Floor). Visiting hours for students and faculty grievances are Monday through Friday from 11:00 AM to 1:00 PM."
  },
  {
    category: "Department Locations",
    topic: "Department Buildings & Blocks",
    keywords: ["department", "block", "building", "cse", "ece", "mech", "where is"],
    answer: "Campus Blocks:\n- Computer Science & Engineering (CSE): Alan Turing Block, 3rd Floor.\n- Electronics & Communication (ECE): Vikram Sarabhai Block, 2nd Floor.\n- Mechanical Engineering: Visvesvaraya Mechanical Block, Ground & 1st Floor.\n- Academic Administration & Dean's Office: Central Administrative Block."
  },
  {
    category: "Campus Transport",
    topic: "University Shuttle Bus Routes and Timings",
    keywords: ["bus", "shuttle", "transport", "metro", "timing", "schedule", "route"],
    answer: "Campus Shuttle Bus Schedule:\n- Route 1 (Metro Station to Main Gate): Runs every 15 minutes between 7:30 AM - 10:30 AM in the morning and 4:30 PM - 7:00 PM in the evening.\n- Route 2 (North Campus Hostels to Turing Block): Runs continuous circular loops every 20 minutes from 8:15 AM to 6:00 PM.\n- Route 3 (City Terminal to South Gate): Morning trips at 7:45 AM, 8:15 AM, 8:45 AM; Evening return trips at 4:45 PM and 5:30 PM."
  },
  {
    category: "Library",
    topic: "Central Library Timings & Borrowing Guidelines",
    keywords: ["library", "books", "borrow", "timings", "reading room"],
    answer: "The Central Library operates from 8:00 AM to 9:30 PM on regular weekdays and 9:00 AM to 5:00 PM on Saturdays. During mid-term and end-term examination weeks, the reading hall hours are extended until 11:30 PM. Undergraduate students can borrow up to 4 books for 14 days, renewable once online via the student portal."
  },
  {
    category: "Cafeteria & Dining",
    topic: "Food Court & Mess Timings",
    keywords: ["canteen", "cafeteria", "food", "mess", "lunch", "breakfast", "dinner"],
    answer: "The Main Campus Cafeteria is open daily from 7:30 AM to 9:00 PM. Breakfast is served 7:30 AM - 9:30 AM, Lunch from 12:00 PM - 2:30 PM, Evening snacks 4:30 PM - 6:00 PM, and Dinner 7:30 PM - 9:00 PM. Digital UPI payments are accepted across all stalls."
  },
  {
    category: "Health & Emergency",
    topic: "Campus Health Center & Ambulance",
    keywords: ["doctor", "health", "hospital", "clinic", "emergency", "ambulance", "medical"],
    answer: "The University Health Center is located on the Ground Floor of Hostel Block A. A resident medical officer and nursing staff are on duty 24x7. For campus medical emergencies and ambulance dispatch, dial internal extension 2222 or call +91 98765 00108."
  },
  {
    category: "Training & Placement",
    topic: "Placement Cell & Internship Policies",
    keywords: ["placement", "tpo", "internship", "job", "career", "interview"],
    answer: "The Training & Placement Officer (TPO) is located on the 1st Floor of the Central Administrative Block. Registration on the TPO portal is mandatory for campus drives. Students with a CGPA >= 6.5 and no active backlogs are eligible for Day-1 tier-1 and tier-2 company recruitments."
  }
];

export function searchCampusKnowledge(query: string): CampusFact[] {
  const q = query.toLowerCase();
  return CAMPUS_GROUNDED_FACTS.filter(fact => {
    return (
      fact.keywords.some(k => q.includes(k.toLowerCase())) ||
      fact.topic.toLowerCase().includes(q) ||
      fact.category.toLowerCase().includes(q)
    );
  });
}
