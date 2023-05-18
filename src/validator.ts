    type ResultType<T> = { [k in keyof T]: string | null };
    type Validators<T> = { [k in keyof T]: (value: T[k]) => string | null }

    function validate<T extends Record<string, unknown>> (
      target: T,
      validators: Validators<T>
    ): ResultType<T> {
  return Object.keys(target).reduce((accum, current) => {
    accum[current as keyof ResultType<T>] = validators[
      current as keyof typeof validators
      ](target[current as keyof T]);
    return accum;
  }, {} as ResultType<T>);
}

console.log(
  validate(
    { name: "John", age: 6 },
    {
      name: (p) => (!p ? "String should not be empty" : null),
      age:  (p) => (p < 10 ? "Small age" : null)
    }
  )
);




    export class Message {
      _id!: string
      type!: 'foo' | 'bar'

      static generate(properties) {
        return {
          _id: properties.test.id as number,
          type: properties.test._type_ as string
        }
      }
    }
