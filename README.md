# Loadbalancer

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 8.1.3.

Run `npm i` before anything else

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Architecture

This uses a mix of imperative code and functional code

Dumb components (inputs, lists) are managed in an imperative way.
Higher components subscribe to a service that manages the state and react accordingly
to changes made by the user. This allows to add new components/charts/features quite
easily, as all the components are decoupled. 

## TODO 

- In terms of code, try to have some reusable components for the table 
  * It's quite the same table
- Tooltip on the chart 
- Allow the chart to be resizable
- Allow an user to pass a custom algorithm ( we can add another editor in the settings section ) 
that generates a distribution.
- Show a treemap inside each rectangle of the stacked chart ( https://bl.ocks.org/chabb/90df7329e1ee33787cda9e3fc488d53b )
  * the treemap would consist of
     * availabe space remaining in a node
     * space taken by a file
- Make an automated assessment of the current distribution ( show what is good / bad on the table/chart )
- Take time into account
     * Show, in percent, the amount of processing done for a file
       ( this could be show in the chart, if we use a treemap for each node )
     * Image we have a queue of files waiting to be processed. We could have a real time
       monitoring that will update the table/charts by removing the processed files and adding the
       new ones

## Dev workflow

There is a pre-commit hook that will ensures that your code is correctly formatted
We could add the typescript validation to it, so people could no push invalid commit
They can still do `commit -n` though


## Profiling

As the goal of this exercise is to cover all the part of a development workflow, i've used
different tools to profile the app

### Memory leaks

You can use the chrome tools to take heap snapshots, that allows to see if objects are correctly
garbage collected.
In the screenshot below, you can see that the chart object ( the chart on the dashboard page)
is not properly garbage collected. Instance are created on the heap, but not released. I 
can see that the chart object is retained by some other object. This gives
me a clue that i forget to manually release an observable object.

![Memory leak, fixed](https://raw.github.com/chabb/load-balancer/master/images/leak-fixed.png)


After making the necessary change, you can see that the chart instance is correctly freed
![Memory leak, leaking](https://raw.github.com/chabb/load-balancer/master/images/leak-leaking.png)


This was an easy case :)

### Bundle size

 This screenshot shows the composition of the bundle. It's useful, because you can see which libraries you are using and
  their respective sizes. The goal here is to locate libraries that are not used ( this can happen by using import
  statements like ```import * from 'd3'``` ( such statements load all the d3 library, but we can only use some submodules ) , and to locate heavy libraries. If a library takes too much place, it might
  be worth finding an alternative, or investigating if it's possible to only import a subset of this library

![BundleBig](https://raw.github.com/chabb/load-balancer/master/images/bigbundle.png)

You can see something suspicious in the above screenshot. The styles (less files) for
our component are way too big. This is because i've been importing by mistakes some
stylesheets from the component-library. After fixing it, you can see that the bundle
makes more sense

![BundleBetter](https://raw.github.com/chabb/load-balancer/master/images/good_bundle.png)

Our app take no space. Only angular, the css styles, and the different modules we use take a lot of space. You can notice
that a lot of space is taken by the icons of the component library. We could remove them


### Time profiler

