export interface Greeting {
  text: string;
}

export function greet(name: string): Greeting {
  const text = `hello ${name}`;
  return { text };
}
