import { User, TrainingRecord } from '../types';

/**
 * Simulates importing Excel data and mapping it to a NoSQL Firestore structure.
 * Excel Columns expected: ['ID', 'Prticipent Name', 'Department', 'Total Courses', 'Date 1', 'Duration 1', 'Scoor 1']
 */
export const importExcelData = async (file: File) => {
  return new Promise((resolve) => {
    // Simulate parsing the file
    setTimeout(() => {
      console.log('Parsed Excel file:', file.name);
      
      // Simulated mapped data
      const firestoreUsers = [
        {
          id: '830557',
          name: 'Amir Samir',
          department: 'Heavy Machinery',
          phone: '01000000001',
          role: 'trainee',
          status: 'approved'
        },
        {
          id: '830548',
          name: 'Keroles Amged',
          department: 'Electrical',
          phone: '01000000002',
          role: 'trainee',
          status: 'approved'
        }
      ];

      const firestoreCoursesAttended = [
        {
          id: 'record_1',
          user_id: '830557',
          course_name: 'Diesel Engine Mechanical Fundamentals',
          date: '2023-09-17',
          duration_days: 3,
          score_percentage: 85
        },
        {
          id: 'record_2',
          user_id: '830548',
          course_name: 'Electricity Fundamentals',
          date: '2023-10-06',
          duration_days: 2,
          score_percentage: 92
        }
      ];

      console.log('Mapped to Firestore users collection:', firestoreUsers);
      console.log('Mapped to Firestore courses_attended collection:', firestoreCoursesAttended);

      resolve({ users: firestoreUsers, coursesAttended: firestoreCoursesAttended });
    }, 2000); // Simulate network/processing delay
  });
};

export const importFromOneDrive = async (link: string) => {
  return new Promise((resolve) => {
    // Simulate fetching and parsing the OneDrive file
    setTimeout(() => {
      console.log('Fetched data from OneDrive link:', link);
      
      // Simulated mapped data
      const firestoreUsers = [
        {
          id: '830557',
          name: 'Amir Samir',
          department: 'Heavy Machinery',
          phone: '01000000001',
          role: 'trainee',
          status: 'approved'
        },
        {
          id: '830548',
          name: 'Keroles Amged',
          department: 'Electrical',
          phone: '01000000002',
          role: 'trainee',
          status: 'approved'
        }
      ];

      const firestoreCoursesAttended = [
        {
          id: 'record_1',
          user_id: '830557',
          course_name: 'Diesel Engine Mechanical Fundamentals',
          date: '2023-09-17',
          duration_days: 3,
          score_percentage: 85
        },
        {
          id: 'record_2',
          user_id: '830548',
          course_name: 'Electricity Fundamentals',
          date: '2023-10-06',
          duration_days: 2,
          score_percentage: 92
        }
      ];

      console.log('Mapped to Firestore users collection:', firestoreUsers);
      console.log('Mapped to Firestore courses_attended collection:', firestoreCoursesAttended);

      resolve({ users: firestoreUsers, coursesAttended: firestoreCoursesAttended });
    }, 2500); // Simulate network/processing delay
  });
};
