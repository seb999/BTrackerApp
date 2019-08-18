export interface HttpSettings {
    url: string;
    dataType?: string;
    method?: "GET" | "POST" | "PUT" | "DELETE";
    data?: any;
    headers?: any;
  }