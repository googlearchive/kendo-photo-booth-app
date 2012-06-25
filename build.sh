echo "building/uglifying JS...."
rm -r src/app/javascripts/build

r.js -o src/app/javascripts/app.build.js

# echo "building/ugliying CSS..."
# rm -r build
# r.js -o app.build.js

# move the build file to the extension
cp src/app/javascripts/build/main.js extension/app/javascripts/main.js

echo "compiling jade views and copying...."
clientjade src/app/index.jade > extension/app/javascripts/jade.js

say "DONE!"
