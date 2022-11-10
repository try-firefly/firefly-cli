function outputValidArguments() {
  console.log('Usage: firefly <subcommand> \n');
  console.log('Please see available subcommands below. \n');
  console.log('init       Initialise firefly. This will instrument your chosen functions and also setup a metric stream and firehose');
  console.log('destroy    Destroy metric stream and firehose');
}

exports.outputValidArguments = outputValidArguments;
