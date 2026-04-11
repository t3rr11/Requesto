# General Principles
**Prefer readable code over cleverness**. It's easy to write a serious piece of code that's optimised out the whazzoo, but if the next developer can't understand what it does that's not very helpful to anyone but yourself and will hurt the project in the future.

**Keep components generic**. When creating components think about how they're going to be used and what the next developer might want to change in their implementation. For example, don't lock in MSAL authentication in a component, because then if a developer uses anything other than MSAL it won't work because it has a dependence on that package. Instead pass in the authentication information as a prop so it can use any provider.

**Data flows down and events flow up**. When creating components ensure that you're avoiding the need to pass information back up (unless in events). Child components should use data from the parent to display what it needs to display and then based on the components actions they should fire events back up for the parent to consume. e.g: `<Button text={buttonText} onClick={handleOnClick}>`

**Consistent terminology**. This one can be hard sometimes as we've all got a different mental language set installed, but one thing we should try our best to standardise is the use of some key words. For example onClick, handleClick. Both on and handle mean different things and have different use cases, but are rarely ever used correctly.

- **onClick** - The on keyword should be used when passing callback functions to components.
  - `<Button onClick={handleClick}>`
- **handleClick** - The handle keyword should be used when handling what happens from that onClick event.
  - `const handleClick = useCallback(() => { /* Do something */ }, []);` 
- Bonus one here for the **use** keyword. It also serves a purpose and usually means whatever is denoted with this keyword is a react hook.
  - **useDialog** - This is a hook that allows you to wrap something in a dialog component and have the hook manage it's own dialog state.
  - **useNetwork** - This is a hook that have event listeners that listen our for network changes and if changes are detected will update anything listen to that hooks state.

# Project Structure
```text
src/
  components/        // Reusable UI components
  pages/             // Route level page components
  hooks/             // Reuseable hooks
  forms/             // React hook form and zod based forms
  store/             // Global state stores
  helpers/           // Reusable utility functions
  styles/            // Global styles and tailwind config
```

# Rules

- No cross-importing of pages, each page needs to be separate from others, the only time they can link is if a page is navigating to the next.
- Components must not import pages. It should only ever be one way, components are used in pages, pages are not used in components.
- All forms should live within the forms folder and use react hook form and zod for validation, this ensure the proper sanitisation and types are being sent per request.
- Shared logic lives in either hooks or helpers, avoid duplication.

# React Component Guidelines

## Components
Components are really helpful for breaking up a piece of work in to smaller chunks making the page or layout easier to digest for the next developer. In doing so they should always strive to be small, stateless and re-usable. This isn't always possible, however it's good to try. Here is a very simple example of a small, stateless, reusable component.

```ts
interface ButtonProps = {
  text: string;               // Your button text data input
  onClick: () => void;        // This is an example of a callback, usually you'd extend the default button component which would inherit this prop
  disabled?: boolean;         // Optional as it defaults to false in the props
}

export function Button({ text, onClick, disabled = false }: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="px-4 py-2 rounded-md"
    >
      {text}
    </button>
  )
}
```

In this example you can see that we're passing in the data required in order to render the component so it can be modified by the parent at will. It has no internal state and does what it is told, however if it's missing properties like disabled it also has defaults to fall back on.

## Hooks
Hooks are really helpful as they can help move the state logic out of your component and in to a re-usable function to use in said component. They also serve more advanced use-cases and can listen to event listeners, but for this example we're just going to focus on a simple hook.

- Hooks must start with use
- Hooks should also not return JSX, they're not components.

```tsx
export function useDialog() {
  const [open, setOpen] = useState(false);

  return {
    open,
    show: () => setOpen(true),
    hide: () => setOpen(false),
  }
}
```

As you can see in this example, we've extracted the state to a hook which can be used in any component as such; const { open, show, hide } = useDialog() noting that this example wouldn't make sense due to it's simplicity, but you get the picture.

# Typescript Standards

Man I love a good typescript project. These standards should help you get started and off on the right track if followed correctly.

- Don't use any unless completely necessary. It's a cop out, just don't do it. There are cases where request handlers may not know the incoming type, but they should be avoided as much as possible.
- Prefer type over interface. Types are much more flexible and interfaces are much more deliberate. My general rule is to use types if you know things will change, but use interface when things are solid.
  - interface - Should be used when defining component props. e.g interface ButtonProps
  - type - Should be used when defining other types, such as User or API request payloads / responses.
  - This is something developers are in-different on all the time, so remember these are what I prefer, not what may be the "right" way to you.

Use narrow types if you know them, this allows you to scope what strings are allowed for a given type. `variant: 'primary' | 'secondary'` meaning a user can't put in anything.

```tsx
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /* Automatically inherits button props, e.g onClick, id, name, etc */
  variant: 'primary' | 'secondary',
}
```

You can even go fancier ``` email: `${string}@${string}` ``` this will allow you to scope down even further.

```ts
type User = {
  id: number;
  email: `${string}@${string}`;
  role: 'admin' | 'user';
}
```


# Tailwind CSS Standards

Tailwind is such a powerful way to write css, in simple terms it's a translation layer that converts all css styles to class names, which should simple until you use it and see just how much time you save when developing.

There are rules however just like everything else.

- Try and use Tailwind classes as much as possible and avoid the need to write inline styles as much as possible, almost everything you can do inline can also be done with tailwind classes.
- Use brand colours defined in the globals.css, in our specific case with themes however avoid using brand colours directly and use them through the custom tailwind classes e.g bg-bae-primary-bg so it works on all themes.
- Avoid arbitrary values like mt-[10px] unless completely necessary, this breaks the standard tailwind has laid out which follows proper UX guidelines set by industry professionals.
- There are cases where you might need to through, e.g positioning icons next to text, or even when using calc h-[calc(100% - 30px)] to account for floating headers etc.
- Use consistent spacing rules (gap-2, gap-4, p-4, p-6), I don't want to see randomly used spacing, if you need to ask the designer to move things down to a specific 6px or 12px range, do so.
- Prefer using flex and gap to space our child elements in a div, over applying margins to each child to maintain spacing.

```tsx
export const Label = ({ value, className, ...props }: LabelProps) => {
  return (
    <label className={clsx('mb-2 flex gap-0.5 text-sm font-medium', className)} {...props}>
      <span>{value}</span>
      {props.required && <span className="text-red-500 select-none">*</span>}
    </label>
  );
};
```


In this example you can see that I am defining my label styles accordingly but also allowing the user to pass in additional classes, then mixing them with clsx which is a class merge util. This means I can design an element the way it should look, unless the developer needs it to be different making it more re-usable.


# State Management Standards

There are a few different types of state.

- useState which lives at a given component level
- useContext which allows you to wrap a bunch of components in this state object using a provider
- useStore based state which we use with Zustand as our global state store

They all serve different purposes.

- useState - Is used primarily when you just need to store something and you don't care if it's lost on re-render for example form entries.
- useContext - Is used for the toast provider, this is so that we can display toasts across different pages/layouts.
- useStore - Is used for all of our Zustand state stores, e.g useUserPreferencesStore. These are global states that may be used across many components/views and will need to re-render if a value within that state changes.

There are some others that haven't been listed such as useReducer which we don't use and coming soon useForm by react.


## State Store Standards

When using Zustand state stores there are some standards that I have set-out, that I tend to follow. Each state store should live within a feature folder within the store primary folder, inside each feature folder there should be 2-3 files. A store.tsx file, an actions.ts file and potentially a types.ts file. These files are used to seperate concerns as state stores can get quite large and quite complex.

```text
├── store                        # Where all the global state stores live
│   ├── feature
│   │   ├── store.ts             # This file contains the store type and useStore hook
│   │   ├── actions.ts           # This file contains to actions for the state store (note: all requests should go through actions, and have the action/store handle saving/updating of state)
│   │   ├── types.ts             # This file contains the types used in those action requests, e.g Request/Response payload types.
```


# Forms and Validation Standards

There are few different options when it comes to creating forms and handling validation and input. For this project we choose to go with what I believe to be the best way of handling form data to date. (subject to change as the market moves).

We've gone with a React Hook Form with zod to handle our input validation and sanitization. This combo gives us the best of both worlds, using reacts new hook based methodology to handle input states and zod's incredibly detailed validation framework to handle validation messages and value parsing before we send the request to the backend.


First we start by defining the form schema in zod.

```tsx
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
```

```tsx
type LoginSchemaValues = z.infer<typeof loginSchema>;       // This will infer the type based on the schema object above
```

Now that we have our schema we need to pass that in to our react hook form object.

```tsx
function LoginForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginSchemaValues>({
    resolver: zodResolver(loginSchema)       // This adds the validation rules to react hook form based on the zod schema
  }); 
 
  const onSubmit = (data: LoginSchemaValues) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input type="email" {...register('email')} /> 
      {errors.email && <span>{errors.email.message}</span>}
 
      <input type="password" {...register('password')} />
      {errors.password && <span>{errors.password.message}</span>}
 
      <button type="submit"/>Submit button</button>
      {errors.root && <span>{errors.root.message}</span>}
    </form>
  );
}
```

When a user adds information to the inputs and clicks the submit button, depending on if the values pass the validation or not, an error message will be displayed, otherwise the form will submit and pass the data to the onSubmit function which will do what it will with the data.

By passing in the zod schema to react hook form, it's also making sure that the data is sanitised as defined before sending this data to the backend as well.

# Loading States

In an application there are a few different ways to handle loading states, the 3 most common are:

- Loading Screens - These hold the user up until everything is loaded. Usually has some waiting text and a spinner. Most commonly used in video games these days where you'd want to load all your assets so your game doesn't look broken.
- Skeleton Loaders - These are usually animated sections that load in once the data is available, very useful for showing incremental data to the user so they have something to view whilst everything else is still loading. These are also helpful for when requests may fail, still allowing the user to see the rest of the information and show an error only on the data that failed to load.
- Invisible - These are background load events, e.g updating some data, or pre-loading information for the next page, action where the user won't notice whether it's there or not. Can also be paired with an indicator like a rotating arrow.
