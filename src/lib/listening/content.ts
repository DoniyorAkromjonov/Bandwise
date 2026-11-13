import campusCues from "@/data/listening-cues/campus-library-tour.json";
import ferryCues from "@/data/listening-cues/harbour-ferry-enquiry.json";
import gardenCues from "@/data/listening-cues/community-garden-project.json";
import residenceCues from "@/data/listening-cues/student-residence-orientation.json";
import riverCues from "@/data/listening-cues/river-volunteer-survey.json";

export type ListeningQuestion = { id: string; prompt: string; options: string[]; answer: string; explanation: string; cueIndex: number };
export type ListeningQuestionPrompt = Pick<ListeningQuestion, "id" | "prompt" | "options">;
export type ListeningCue = { start: number; end: number; text: string };
export type ListeningMaterial = {
  slug: string; title: string; description: string; category: string; difficulty: "BEGINNER" | "INTERMEDIATE" | "UPPER_INTERMEDIATE" | "ADVANCED";
  audioUrl: string; cues: ListeningCue[]; questions: ListeningQuestion[];
};

export const listeningMaterials: ListeningMaterial[] = [
  {
    slug: "campus-library-tour", title: "A tour of the campus library", category: "Campus life", difficulty: "BEGINNER",
    description: "A student guide explains borrowing rules, study spaces and how to reserve a room.", audioUrl: "/audio/listening/campus-library-tour.wav", cues: campusCues,
    questions: [
      { id: "q1", prompt: "Where is the help desk?", options: ["Beside the staircase", "On the second floor", "Near the blue return box"], answer: "Beside the staircase", explanation: "The guide says it is beside the staircase, just inside the main entrance.", cueIndex: 1 },
      { id: "q2", prompt: "How many books may students borrow at one time?", options: ["Four", "Six", "Eight"], answer: "Six", explanation: "The guide says students may borrow up to six books at once.", cueIndex: 2 },
      { id: "q3", prompt: "How long may students borrow books?", options: ["Two weeks", "Three weeks", "Six weeks"], answer: "Three weeks", explanation: "Students may borrow books for three weeks.", cueIndex: 2 },
      { id: "q4", prompt: "Where is the quiet study room?", options: ["On the first floor", "On the second floor, opposite the computer area", "On the third floor"], answer: "On the second floor, opposite the computer area", explanation: "The guide locates the quiet room on floor two, opposite the computer area.", cueIndex: 3 },
      { id: "q5", prompt: "How far ahead can a group room be reserved?", options: ["One day", "Two days", "A week"], answer: "Two days", explanation: "Reservations can be made up to two days in advance.", cueIndex: 4 },
      { id: "q6", prompt: "Where can students print documents?", options: ["Beside the computers", "At the main entrance", "In the group room"], answer: "Beside the computers", explanation: "The guide says the printers are beside the computers.", cueIndex: 5 },
      { id: "q7", prompt: "What colour is the book return box?", options: ["Green", "Blue", "Red"], answer: "Blue", explanation: "The return box is blue and stands near the exit.", cueIndex: 6 },
      { id: "q8", prompt: "Where should books be returned after closing?", options: ["At the help desk", "In the blue box by the exit", "On the third floor"], answer: "In the blue box by the exit", explanation: "The guide says the box near the exit remains available after closing.", cueIndex: 6 },
    ],
  },
  {
    slug: "harbour-ferry-enquiry", title: "Booking a ferry to North Bay", category: "Travel", difficulty: "INTERMEDIATE",
    description: "A passenger calls a ferry office to choose a sailing and check ticket details.", audioUrl: "/audio/listening/harbour-ferry-enquiry.wav", cues: ferryCues,
    questions: [
      { id: "q1", prompt: "Which day does the passenger want to travel?", options: ["Friday", "Saturday", "Sunday"], answer: "Saturday", explanation: "The passenger asks to travel on Saturday.", cueIndex: 1 },
      { id: "q2", prompt: "What time does the first ferry leave?", options: ["9:15", "10:15", "10:30"], answer: "9:15", explanation: "The agent says the first ferry leaves at nine fifteen.", cueIndex: 2 },
      { id: "q3", prompt: "How long does the crossing take?", options: ["20 minutes", "40 minutes", "One hour"], answer: "40 minutes", explanation: "The crossing takes about forty minutes.", cueIndex: 2 },
      { id: "q4", prompt: "What time is the later ferry?", options: ["9:15", "10:15", "10:30"], answer: "10:30", explanation: "The later sailing departs at ten thirty.", cueIndex: 3 },
      { id: "q5", prompt: "How much is a return ticket?", options: ["£18", "£28", "£38"], answer: "£28", explanation: "The agent gives the return fare as twenty-eight pounds.", cueIndex: 4 },
      { id: "q6", prompt: "What can travel free?", options: ["A bicycle", "A second passenger", "A large suitcase"], answer: "A bicycle", explanation: "The agent says bicycles travel free.", cueIndex: 4 },
      { id: "q7", prompt: "How early should the passenger arrive?", options: ["10 minutes", "20 minutes", "40 minutes"], answer: "20 minutes", explanation: "Passengers should arrive twenty minutes before departure.", cueIndex: 6 },
      { id: "q8", prompt: "Where is the ticket office?", options: ["Beside platform one", "Next to platform two", "Inside the café"], answer: "Next to platform two", explanation: "The agent locates the ticket office next to platform two.", cueIndex: 6 },
    ],
  },
  {
    slug: "community-garden-project", title: "Planning a community garden", category: "Community", difficulty: "INTERMEDIATE",
    description: "Meeting notes cover a new garden, its opening workday, supplies and weekly workshops.", audioUrl: "/audio/listening/community-garden-project.wav", cues: gardenCues,
    questions: [
      { id: "q1", prompt: "Where will the garden be built?", options: ["Behind the sports centre", "Beside the library", "Near the college"], answer: "Behind the sports centre", explanation: "The unused land is behind the sports centre.", cueIndex: 1 },
      { id: "q2", prompt: "When is the first site-clearing day?", options: ["5 May", "12 May", "15 May"], answer: "12 May", explanation: "The date changed to the twelfth of May.", cueIndex: 2 },
      { id: "q3", prompt: "What should volunteers bring?", options: ["Seeds", "A water tank", "Gloves"], answer: "Gloves", explanation: "Organisers provide tools and water; volunteers should bring gloves.", cueIndex: 3 },
      { id: "q4", prompt: "Which vegetables will be grown?", options: ["Tomatoes and beans", "Potatoes and carrots", "Peas and onions"], answer: "Tomatoes and beans", explanation: "The group plans to grow tomatoes, beans and herbs.", cueIndex: 4 },
      { id: "q5", prompt: "Who will provide seeds?", options: ["The library", "The sports centre", "The local market"], answer: "The library", explanation: "The library has offered seeds.", cueIndex: 4 },
      { id: "q6", prompt: "What will the college lend?", options: ["Garden tools", "A water tank", "A greenhouse"], answer: "A water tank", explanation: "The local college will lend the project a water tank.", cueIndex: 4 },
      { id: "q7", prompt: "When will the workshops take place?", options: ["Tuesday mornings", "Thursday evenings", "Saturday afternoons"], answer: "Thursday evenings", explanation: "The workshops are scheduled for Thursday evenings.", cueIndex: 6 },
      { id: "q8", prompt: "Where should new volunteers sign up?", options: ["On the project website", "At the college", "On the list by the entrance"], answer: "On the list by the entrance", explanation: "Participants should write their names on the list by the entrance.", cueIndex: 7 },
    ],
  },
  {
    slug: "student-residence-orientation", title: "Moving into North Hall", category: "Campus life", difficulty: "INTERMEDIATE",
    description: "A residence adviser explains check-in, facilities, meal times and quiet hours to a new student.", audioUrl: "/audio/listening/student-residence-orientation.wav", cues: residenceCues,
    questions: [
      { id: "q1", prompt: "Where is the residence reception?", options: ["Behind the café", "Beside the sports centre", "Opposite the library"], answer: "Behind the café", explanation: "The adviser says reception is behind the café, through the glass doors.", cueIndex: 1 },
      { id: "q2", prompt: "Which room has the student been assigned?", options: ["Room 124", "Room 214", "Room 241"], answer: "Room 214", explanation: "The student is assigned room 214 on the second floor.", cueIndex: 2 },
      { id: "q3", prompt: "What time does check-in begin?", options: ["12:00", "2:00", "4:00"], answer: "2:00", explanation: "Residents can collect their keys from two o'clock.", cueIndex: 3 },
      { id: "q4", prompt: "How much is the key deposit?", options: ["£40", "£60", "£80"], answer: "£60", explanation: "The adviser explains that the refundable key deposit is sixty pounds.", cueIndex: 3 },
      { id: "q5", prompt: "Where is the laundry room?", options: ["On the ground floor", "On the first floor", "On the fourth floor"], answer: "On the first floor", explanation: "The laundry room is on the first floor beside the common kitchen.", cueIndex: 4 },
      { id: "q6", prompt: "What does a resident need to use the laundry machines?", options: ["A bank card", "A residence card", "A paper token"], answer: "A residence card", explanation: "The machines are operated by tapping a residence card.", cueIndex: 4 },
      { id: "q7", prompt: "When does breakfast finish on weekdays?", options: ["9:00", "9:30", "10:00"], answer: "9:30", explanation: "Weekday breakfast is served until half past nine.", cueIndex: 5 },
      { id: "q8", prompt: "When do quiet hours begin?", options: ["9:00 pm", "10:00 pm", "11:00 pm"], answer: "10:00 pm", explanation: "Quiet hours begin at ten o'clock every evening.", cueIndex: 6 },
    ],
  },
  {
    slug: "river-volunteer-survey", title: "Joining a river survey", category: "Environment", difficulty: "UPPER_INTERMEDIATE",
    description: "A project coordinator briefs volunteers on a river survey, safety and recording observations.", audioUrl: "/audio/listening/river-volunteer-survey.wav", cues: riverCues,
    questions: [
      { id: "q1", prompt: "Where will volunteers meet?", options: ["Oak Bridge", "The railway station", "The visitor centre"], answer: "Oak Bridge", explanation: "The coordinator says the group will meet at Oak Bridge.", cueIndex: 1 },
      { id: "q2", prompt: "On which date will the survey take place?", options: ["11 June", "18 June", "21 June"], answer: "18 June", explanation: "The date was moved from the eleventh to the eighteenth of June.", cueIndex: 2 },
      { id: "q3", prompt: "What time should volunteers arrive?", options: ["8:45", "9:15", "9:45"], answer: "9:15", explanation: "The briefing begins at a quarter past nine.", cueIndex: 3 },
      { id: "q4", prompt: "What should participants wear?", options: ["Walking boots", "A life jacket", "A white coat"], answer: "Walking boots", explanation: "The coordinator asks volunteers to wear walking boots.", cueIndex: 4 },
      { id: "q5", prompt: "What will the organisers provide?", options: ["Waterproof jackets", "Sample bottles", "Lunch boxes"], answer: "Sample bottles", explanation: "Sample bottles and clipboards will be provided.", cueIndex: 5 },
      { id: "q6", prompt: "What should volunteers do before recording a sample?", options: ["Enter the water alone", "Check the weather", "Move to the riverbank"], answer: "Check the weather", explanation: "Volunteers should record the weather on the yellow form before taking a sample.", cueIndex: 6 },
      { id: "q7", prompt: "When will the group have lunch?", options: ["11:00", "12:00", "1:00"], answer: "12:00", explanation: "The group plans to have lunch at noon.", cueIndex: 7 },
      { id: "q8", prompt: "When is the next training session?", options: ["Tuesday evening", "Wednesday morning", "Friday afternoon"], answer: "Tuesday evening", explanation: "The next training session is on Tuesday evening.", cueIndex: 8 },
    ],
  },
];

export function findListeningMaterial(slug: string) {
  return listeningMaterials.find((material) => material.slug === slug);
}

export function formatAudioTime(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}
