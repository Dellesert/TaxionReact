require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'ShareData'
  s.version        = package['version']
  s.summary        = 'Share data between main app and share extension'
  s.description    = 'Expo module to sync auth and chat data to iOS Share Extension via App Groups'
  s.license        = 'MIT'
  s.author         = 'dellesert'
  s.homepage       = 'https://github.com/dellesert'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = '**/*.{h,m,swift}'
end
