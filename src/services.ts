import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_PROJECT_URL!,
  import.meta.env.VITE_ANON_KEY!,
);

type Event = {
  summary: string;
  description: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
};

export type EventResource = {
  kind: "calendar#event";
  etag: string;
  id: string;
  status: string;
  htmlLink: string;
  created: string; // datetime
  updated: string; // datetime
  summary: string;
  description: string;
  location: string;
  colorId: string;
  creator: {
    id: string;
    email: string;
    displayName: string;
    self: boolean;
  };
  organizer: {
    id: string;
    email: string;
    displayName: string;
    self: boolean;
  };
  start: {
    date: string; // date
    dateTime: string; // datetime
    timeZone: string;
  };
  end: {
    date: string; // date
    dateTime: string; // datetime
    timeZone: string;
  };
  endTimeUnspecified: boolean;
  recurrence: string[];
  recurringEventId: string;
  originalStartTime: {
    date: string; // date
    dateTime: string; // datetime
    timeZone: string;
  };
  transparency: string;
  visibility: string;
  iCalUID: string;
  sequence: number;
  attendees: Array<{
    id: string;
    email: string;
    displayName: string;
    organizer: boolean;
    self: boolean;
    resource: boolean;
    optional: boolean;
    responseStatus: string;
    comment: string;
    additionalGuests: number;
  }>;
  attendeesOmitted: boolean;
  extendedProperties: {
    private: {
      [key: string]: string;
    };
    shared: {
      [key: string]: string;
    };
  };
  hangoutLink: string;
  conferenceData: {
    createRequest: {
      requestId: string;
      conferenceSolutionKey: {
        type: string;
      };
      status: {
        statusCode: string;
      };
    };
    entryPoints: Array<{
      entryPointType: string;
      uri: string;
      label: string;
      pin: string;
      accessCode: string;
      meetingCode: string;
      passcode: string;
      password: string;
    }>;
    conferenceSolution: {
      key: {
        type: string;
      };
      name: string;
      iconUri: string;
    };
    conferenceId: string;
    signature: string;
    notes: string;
  };
  gadget: {
    type: string;
    title: string;
    link: string;
    iconLink: string;
    width: number;
    height: number;
    display: string;
    preferences: {
      [key: string]: string;
    };
  };
  anyoneCanAddSelf: boolean;
  guestsCanInviteOthers: boolean;
  guestsCanModify: boolean;
  guestsCanSeeOtherGuests: boolean;
  privateCopy: boolean;
  locked: boolean;
  reminders: {
    useDefault: boolean;
    overrides: Array<{
      method: string;
      minutes: number;
    }>;
  };
  source: {
    url: string;
    title: string;
  };
  workingLocationProperties: {
    type: string;
    homeOffice: any; // The type for (value) is not specified, so using 'any'
    customLocation: {
      label: string;
    };
    officeLocation: {
      buildingId: string;
      floorId: string;
      floorSectionId: string;
      deskId: string;
      label: string;
    };
  };
  outOfOfficeProperties: {
    autoDeclineMode: string;
    declineMessage: string;
  };
  focusTimeProperties: {
    autoDeclineMode: string;
    declineMessage: string;
    chatStatus: string;
  };
  attachments: Array<{
    fileUrl: string;
    title: string;
    mimeType: string;
    iconLink: string;
    fileId: string;
  }>;
  eventType: string;
};

export class Calendar {
  private url =
    "https://www.googleapis.com/calendar/v3/calendars/primary/events";
  token = "";

  constructor(token: string) {
    this.token = token;
  }

  async createEvent(event: Event): Promise<EventResource> {
    if (!this.token) {
      return { id: "" } as EventResource;
    }
    const res = await fetch(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(event),
    });

    const response = await res.json();

    if (res.ok) {
      return response;
    }
    throw response.error;
  }

  async updateEvent(event: Event, id?: string): Promise<EventResource> {
    if (!this.token || !id) {
      return { id: "" } as EventResource;
    }
    const res = await fetch(`${this.url}/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(event),
    });

    const response = await res.json();

    if (res.ok) {
      return response;
    }
    throw response.error;
  }

  async deleteEvent(eventId?: string) {
    if (!this.token || !eventId) {
      return { id: "" } as EventResource;
    }
    const res = await fetch(`${this.url}/${eventId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (res.ok) {
      return "Event deleted";
    }

    const response = await res.json();
    throw response.error;
  }
}
