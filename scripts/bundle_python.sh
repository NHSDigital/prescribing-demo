VENV=$(~/.local/bin/pipenv --venv)
ls $VENV/lib
SITE_PACKAGES=$VENV/lib/python3.8/site-packages
echo "Library Location: $SITE_PACKAGES"
DIR=$(pwd)

cd $SITE_PACKAGES
zip -r9 $DIR/handler.zip *

cd $DIR
zip -g handler.zip handler.py