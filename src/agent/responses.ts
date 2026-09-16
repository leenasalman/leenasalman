/**
 * Hand-authored A2UI responses, one per answer shape.
 *
 * These stand in for a model's output. They are written exactly as an agent
 * would emit them — flat component lists, JSON Pointer bindings, templates
 * and built-in functions — so the renderer is exercised against real payloads
 * rather than a convenient subset.
 */
import type { A2UIComponent, Json } from "../a2ui/protocol";

export interface A2UIResponse {
  components: A2UIComponent[];
  dataModel: Json;
  /**
   * The container whose `children` later content is appended to. An agent
   * tracks this so it can extend an answer by re-sending one component
   * instead of the whole tree.
   */
  containerId: string;
}

/** Card + list templates + two-way checkboxes + a slider. */
export const recipeAnswer: A2UIResponse = {
  containerId: "body",
  components: [
    { id: "root", component: "Card", child: "body" },
    {
      id: "body",
      component: "Column",
      children: ["title", "meta", "servings", "rule", "ingHead", "ingList", "stepHead", "stepList", "save"],
    },
    { id: "title", component: "Text", variant: "h2", text: { path: "/recipe/title" } },
    { id: "meta", component: "Row", justify: "spaceBetween", children: ["time", "level"] },
    {
      id: "time",
      component: "Text",
      variant: "caption",
      text: { call: "formatString", args: { value: "${/recipe/minutes} minutes" } },
    },
    { id: "level", component: "Text", variant: "caption", text: { path: "/recipe/difficulty" } },
    {
      id: "servings",
      component: "Slider",
      label: "Servings",
      value: { path: "/recipe/servings" },
      min: 1,
      max: 8,
    },
    { id: "rule", component: "Divider" },
    { id: "ingHead", component: "Text", variant: "h4", text: "Ingredients" },
    { id: "ingList", component: "List", children: { path: "/recipe/ingredients", componentId: "ingRow" } },
    {
      id: "ingRow",
      component: "CheckBox",
      // Relative paths resolve inside each item of /recipe/ingredients.
      label: { call: "formatString", args: { value: "${amount} ${name}" } },
      value: { path: "have" },
    },
    { id: "stepHead", component: "Text", variant: "h4", text: "Method" },
    { id: "stepList", component: "List", children: { path: "/recipe/steps", componentId: "stepText" } },
    { id: "stepText", component: "Text", text: { path: "text" } },
    {
      id: "save",
      component: "Button",
      variant: "primary",
      child: "saveLabel",
      action: {
        event: {
          name: "saveRecipe",
          context: { title: { path: "/recipe/title" }, servings: { path: "/recipe/servings" } },
        },
      },
    },
    { id: "saveLabel", component: "Text", text: "Save recipe" },
  ],
  dataModel: {
    recipe: {
      title: "One-pan lemon orzo",
      minutes: 25,
      difficulty: "Easy",
      servings: 2,
      ingredients: [
        { name: "orzo", amount: "200g", have: false },
        { name: "lemon", amount: "1", have: false },
        { name: "spinach", amount: "2 handfuls", have: false },
        { name: "parmesan", amount: "40g", have: false },
      ],
      steps: [
        { text: "Toast the orzo in olive oil until it smells nutty." },
        { text: "Add stock a ladle at a time until just absorbed." },
        { text: "Fold through spinach, lemon zest and parmesan." },
      ],
    },
  },
};

/** Tabs + per-day column templates. */
export const tripAnswer: A2UIResponse = {
  containerId: "root",
  components: [
    { id: "root", component: "Column", children: ["heading", "tabs"] },
    { id: "heading", component: "Text", variant: "h2", text: { path: "/trip/city" } },
    {
      id: "tabs",
      component: "Tabs",
      tabs: [
        { title: "Day 1", child: "day1" },
        { title: "Day 2", child: "day2" },
        { title: "Budget", child: "budget" },
      ],
    },
    { id: "day1", component: "List", children: { path: "/trip/days/0/items", componentId: "itemCard" } },
    { id: "day2", component: "List", children: { path: "/trip/days/1/items", componentId: "itemCard" } },
    { id: "itemCard", component: "Card", child: "itemBody" },
    { id: "itemBody", component: "Column", children: ["itemName", "itemNote"] },
    { id: "itemName", component: "Text", variant: "h5", text: { path: "name" } },
    { id: "itemNote", component: "Text", variant: "caption", text: { path: "note" } },
    { id: "budget", component: "Column", children: ["budgetTotal", "budgetSlider", "budgetNote"] },
    {
      id: "budgetTotal",
      component: "Text",
      variant: "h3",
      text: {
        call: "formatString",
        args: { value: "${formatCurrency(value:${/trip/budget}, currency:'EUR')} per person" },
      },
    },
    {
      id: "budgetSlider",
      component: "Slider",
      label: "Adjust budget",
      value: { path: "/trip/budget" },
      min: 200,
      max: 2000,
    },
    { id: "budgetNote", component: "Text", variant: "caption", text: "Flights and hotel included." },
  ],
  dataModel: {
    trip: {
      city: "Lisbon, 2 days",
      budget: 640,
      days: [
        {
          items: [
            { name: "Alfama at sunrise", note: "Quiet before the tram queues build." },
            { name: "Time Out Market", note: "Lunch. Go early for a seat." },
          ],
        },
        {
          items: [
            { name: "Belém", note: "Tower, monastery, then pastéis." },
            { name: "LX Factory", note: "Bookshop and rooftop for the evening." },
          ],
        },
      ],
    },
  },
};

/** Side-by-side cards + a filterable chip picker. */
export const compareAnswer: A2UIResponse = {
  containerId: "root",
  components: [
    { id: "root", component: "Column", children: ["heading", "picker", "cards"] },
    { id: "heading", component: "Text", variant: "h2", text: "Which laptop?" },
    {
      id: "picker",
      component: "ChoicePicker",
      label: "What matters most?",
      variant: "multipleSelection",
      displayStyle: "chips",
      value: { path: "/prefs/priorities" },
      options: [
        { label: "Battery", value: "battery" },
        { label: "Weight", value: "weight" },
        { label: "Price", value: "price" },
        { label: "Screen", value: "screen" },
      ],
    },
    { id: "cards", component: "Row", align: "stretch", children: { path: "/laptops", componentId: "laptopCard" } },
    { id: "laptopCard", component: "Card", child: "laptopBody" },
    { id: "laptopBody", component: "Column", children: ["laptopName", "laptopPrice", "laptopSpec", "pickBtn"] },
    { id: "laptopName", component: "Text", variant: "h5", text: { path: "name" } },
    {
      id: "laptopPrice",
      component: "Text",
      text: { call: "formatString", args: { value: "${formatCurrency(value:${price}, currency:'USD')}" } },
    },
    {
      id: "laptopSpec",
      component: "Text",
      variant: "caption",
      text: { call: "formatString", args: { value: "${weight}kg · ${battery}h battery" } },
    },
    {
      id: "pickBtn",
      component: "Button",
      child: "pickLabel",
      action: { event: { name: "pickLaptop", context: { name: { path: "name" } } } },
    },
    { id: "pickLabel", component: "Text", text: "Choose this" },
  ],
  dataModel: {
    prefs: { priorities: ["battery"] },
    laptops: [
      { name: "Air 13", price: 1099, weight: 1.24, battery: 18 },
      { name: "Pro 14", price: 1999, weight: 1.55, battery: 22 },
    ],
  },
};

/** Fallback for anything unrecognised. */
export const fallbackAnswer = (query: string): A2UIResponse => ({
  containerId: "body",
  components: [
    { id: "root", component: "Card", child: "body" },
    { id: "body", component: "Column", children: ["heading", "echo", "hint"] },
    { id: "heading", component: "Text", variant: "h3", text: "No canned layout for that" },
    {
      id: "echo",
      component: "Text",
      text: { call: "formatString", args: { value: 'You asked: "${/query}"' } },
    },
    {
      id: "hint",
      component: "Text",
      variant: "caption",
      text: "This demo agent is scripted. Try *recipe*, *trip* or *compare* — or wire a model in to generate a layout for any question.",
    },
  ],
  dataModel: { query },
});
