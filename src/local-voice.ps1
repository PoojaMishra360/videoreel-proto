$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new()
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$request = [Console]::In.ReadToEnd() | ConvertFrom-Json
if (-not $request.text -or -not $request.outputPath) {
  throw 'text and outputPath are required.'
}
Add-Type -AssemblyName System.Speech
$synth = [System.Speech.Synthesis.SpeechSynthesizer]::new()
$events = [System.Collections.Generic.List[object]]::new()
$synth.Rate = 0
$synth.Volume = 100
$synth.add_SpeakProgress({
  param($sender, $eventArgs)
  $events.Add([pscustomobject]@{
    characterPosition = [int]$eventArgs.CharacterPosition
    characterCount = [int]$eventArgs.CharacterCount
    audioTime = [double]$eventArgs.AudioPosition.TotalSeconds
  }) | Out-Null
})
$synth.SetOutputToWaveFile([string]$request.outputPath)
$synth.Speak([string]$request.text)
$duration = [double]$synth.AudioPosition.TotalSeconds
$synth.SetOutputToNull()
$synth.Dispose()
$matches = [regex]::Matches([string]$request.text, '\S+')
$words = [System.Collections.Generic.List[object]]::new()
$previousStart = 0.0
for ($index = 0; $index -lt $matches.Count; $index++) {
  $match = $matches[$index]
  $event = $events | Where-Object { $_.characterPosition -le $match.Index } | Sort-Object characterPosition -Descending | Select-Object -First 1
  if ($event) {
    $start = [double]$event.audioTime
  } else {
    $start = $duration * ($match.Index / [Math]::Max(1, $request.text.Length))
  }
  if ($index -eq 0) { $start = 0.0 }
  $start = [Math]::Max($previousStart, [Math]::Min($start, $duration))
  $words.Add([pscustomobject]@{ text = [string]$match.Value; start = $start; end = $start }) | Out-Null
  $previousStart = $start
}
for ($index = 0; $index -lt $words.Count; $index++) {
  if ($index + 1 -lt $words.Count) {
    $words[$index].end = [Math]::Max($words[$index].start + 0.01, $words[$index + 1].start)
  } else {
    $words[$index].end = [Math]::Max($words[$index].start + 0.01, $duration)
  }
}
$result = [pscustomobject]@{ duration = $duration; words = @($words.ToArray()) }
$json = ConvertTo-Json -InputObject $result -Depth 8 -Compress
[Console]::Out.WriteLine($json)
